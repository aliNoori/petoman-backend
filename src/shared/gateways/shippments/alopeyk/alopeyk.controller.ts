import {
    BadRequestException,
    Body,
    Controller,
    Get,
    HttpException,
    HttpStatus,
    InternalServerErrorException, NotFoundException,
    Param,
    Post,
    Request,
    UseGuards
} from '@nestjs/common';
import {ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiTags} from '@nestjs/swagger';
import {JwtAuthGuard} from "../../../auth/guards/jwt-auth.guard";
import {AlopeykAddress, AlopeykService, CreateAlopeykOrderDto} from "./alopeyk.service";
import {UserOrderService} from "../../../../modules/market/user/orders/user-order.service";
import {BlacklistGuard} from "../../../auth/guards/blacklist.guard";
import {TenantContext} from "../../../../tenants/tenant-context.service";
import {TenantMembershipGuard} from "../../../auth/guards/tenant-membership.guard";
import {TenantGuard} from "../../../auth/guards/tenant.guard";
import {CapabilityGuard} from "../../../auth/guards/capability.guard";
import {Capabilities} from "../../../auth/decorators/capabilities.decorator";
import {Permissions} from "../../../auth/decorators/permissions.decorator";

@ApiTags('Alopeyk')
@ApiBearerAuth()
@Controller('alopeyk')
export class AlopeykController {
    constructor(
        private readonly alopeykService: AlopeykService,
        private readonly orderService: UserOrderService,
        private tenantContext: TenantContext,
    ) {
    }

    /**
     * ایجاد سفارش پست از طریق بک‌اند
     * این متد توسط فروشگاه (Tenant) یا سیستم مدیریت سفارشات فراخوانی می‌شود.
     */
    @UseGuards(JwtAuthGuard,BlacklistGuard)
    @Post('create-order')
    @ApiOperation({summary: 'ایجاد سفارش در الوپیک'})
    async createOrder(
        @Body() dto: CreateAlopeykOrderDto,
        @Request() req
    ) {
        // 1. اعتبارسنجی توکن فروشگاه (اگر توکن در دیتابیس ذخیره شده، اینجا چک کنید)
        // در اینجا فرض می‌کنیم dto.tenantToken از سمت کلاینت می‌آید اما باید امنیت آن را تامین کنید
        // بهتر است tenantId را از req.user.tenantId بگیرید و توکن را از دیتابیس بخوانید.

        try {
            // 2. تماس با API الوپیک
            const result = await this.alopeykService.createOrder(dto);

            const alopeykOrderId = result.data.id;
            const orderToken = result.data.order_token;

            // 3. ذخیره اطلاعات در دیتابیس سفارش داخلی (برای پیگیری بعدی)
            // فرض: این متد سفارش داخلی را آپدیت می‌کند که این سفارش با الوپیک ارسال شده
            await this.orderService.updateShipmentInfo(dto.extraParams.order_id, {
                alopeykOrderId: alopeykOrderId,
                trackingCode: orderToken,
                provider: 'alopeyk'
            });

            return {
                success: true,
                message: 'سفارش با موفقیت در الوپیک ثبت شد',
                data: result.data
            };

        } catch (error) {
            throw error; // ارور را به کلاینت می‌فرستیم
        }
    }

    /**
     * دریافت وضعیت سفارش الوپیک
     */
    @UseGuards(JwtAuthGuard,BlacklistGuard)
    @Get('status/:alopeykOrderId')
    @ApiOperation({summary: 'دریافت وضعیت سفارش الوپیک'})
    async getOrderStatus(
        @Param('alopeykOrderId') alopeykOrderId: string,
    ) {
        try {
            return await this.alopeykService.getAlopeykOrderStatus(alopeykOrderId);
        } catch (error) {
            throw error;
        }
    }

    /**
     * ایجاد سفارش پستی (الوپیک)
     * این متد توسط پنل مدیریت یا سیستم خودکار فراخوانی می‌شود
     */
    @UseGuards(
        TenantMembershipGuard,
        TenantGuard,
        CapabilityGuard,
    )
    @Capabilities('PRODUCT_MANAGEMENT')///TODO:add capabilities new alopeyk
    @Permissions('settings.manage')
    @UseGuards(JwtAuthGuard,BlacklistGuard)
    @Post(':id/ship-alopeyk')
    async shipWithAlopeyk(
        @Param('id') orderId: string,
        @Request() req,
        @Body() payload: {
            origin: AlopeykAddress;
            destination: AlopeykAddress;
            cashed: boolean;
            schedule_at?: string;
            hasReturn?: boolean;
            transportType?: string;
        }
    ) {
        const userId = req.user.id;
        const tenantId = this.tenantContext.getTenantId();

        // 1. بررسی مالکیت/دسترسی به سفارش
        const order = await this.orderService.getOrderByTenantId(orderId, tenantId);
        if (!order) {
            throw new NotFoundException('سفارش یافت نشد');
        }

        let alopeykData;

        try {
            // --- مرحله 1: ایجاد سفارش در الوپیک ---
            alopeykData = await this.alopeykService.createOrder({
                origin: payload.origin,
                destination: payload.destination,
                has_return: payload.hasReturn,
                cashed: payload.cashed,
                schedule_at: payload.schedule_at,
                extraParams: {
                    tenant_token: tenantId,
                    order_code: order.orderCode
                }
            });

            // --- مرحله 2: ذخیره اطلاعات در دیتابیس خودتان ---
            // این خط فقط اجرا می‌شود اگر مرحله 1 موفق باشد
            await this.orderService.updateShipmentInfo(order.id, {
                alopeykOrderId: alopeykData.data.id,
                trackingCode: alopeykData.data.id,
                // سایر فیلدهای مورد نیاز
            });

        } catch (error: any) {
            // --- مدیریت خطا (هم برای الوپیک و هم برای دیتابیس) ---

            // اگر خطا مربوط به الوپیک باشد (مرحله 1)
            if (!alopeykData) {
                console.error('Alopeyk API Error:', error);
                throw new BadRequestException(`خطا در ثبت سفارش در الوپیک: ${error.message}`);
            }

            // اگر خطا مربوط به دیتابیس باشد (مرحله 2)
            // یعنی سفارش در الوپیک ثبت شده اما در دیتابیس ما ذخیره نشده.
            // باید سفارش الوپیک را لغو کنیم.
            console.error('Database Save Error. Rolling back Alopeyk order:', error);

            try {
                // لغو سفارش در الوپیک
                await this.alopeykService.cancelOrder(alopeykData.data.id);
                console.log(`Order ${alopeykData.data.id} successfully cancelled in Alopeyk.`);
            } catch (cancelError) {
                // اگر لغو هم موفق نشد، لاگ کنید (سفارش یتیم شده)
                console.error('Failed to cancel Alopeyk order. Manual intervention needed.', cancelError);
                // اینجا می‌توانید یک نوتیفیکیشن برای ادمین بفرستید
            }

            throw new InternalServerErrorException('خطا در فرآیند نهایی‌سازی سفارش');
        }

        return {
            success: true,
            message: 'سفارش با موفقیت ثبت شد',
            data: {
                trackingCode: alopeykData.data.id,
                invoiceNumber: alopeykData.data.invoice_number,
                alopeykOrderId: alopeykData.data.id
            }
        };
    }

    /**
     * لغو سفارش پستی از طریق کاربر یا ادمین
     */
    @UseGuards(JwtAuthGuard,BlacklistGuard)
    @Post(':id/cancel-shipment')
    @ApiOperation({ summary: 'لغو سفارش پستی (فقط قبل از پذیرش پیک)' })
    async cancelShipment(
        @Param('id') orderId: string,
        @Request() req
    ) {
        const userId = req.user.id;

        const tenantId = this.tenantContext.getTenantId();
        // 1. دریافت سفارش و بررسی مالکیت
        const order = await this.orderService.getOrderByTenantId(orderId, tenantId);
        // 2. بررسی اینکه آیا سفارش اصلا پستی شده است؟
        const alopeykOrderId = order.metadata?.alopeykOrderId;

        if (!alopeykOrderId) {
            throw new HttpException('این سفارش دارای کد رهگیری پستی نیست', HttpStatus.BAD_REQUEST);
        }
        // 3. تلاش برای لغو در الوپیک
        try {
            const result = await this.alopeykService.cancelOrder(alopeykOrderId);
            // 4. به‌روزرسانی وضعیت سفارش در دیتابیس خودمان
            await this.orderService.updateShipmentInfo(order.id, {
                alopeykOrderId:result.data.id,
                trackingCode:result.data.order_token,
                alopeykOrderStatus: 'cancelled', // یا یک وضعیت جدید مثل 'alopeyk_cancelled'
                cancelledAt: new Date()
            });

            // 5. تغییر وضعیت سفارش در سیستم ما (اختیاری: بستگی به فلو کار شما دارد)
            // this.orderStateMachine.changeStatus(order, OrderStatus.TENANT_CANCELLED);

            return {
                success: true,
                message: 'سفارش با موفقیت در سرویس پستی لغو شد',
                data: result.data
            };

        } catch (error) {
            throw error; // ارور را به کلاینت می‌فرستیم (مثلاً اگر پیک پذیرفته باشد)
        }
    }
}