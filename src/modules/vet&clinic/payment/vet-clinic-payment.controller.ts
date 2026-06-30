import { Body, Controller, Get, Param, Post, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import {
    ApiBearerAuth, ApiOkResponse, ApiCreatedResponse,
    ApiOperation, ApiParam, ApiBody, ApiTags,
} from '@nestjs/swagger';
import { VetClinicPaymentService } from "./vet-clinic-payment.service";
import {SubmitOrderVetClinicDto} from "../../../shared/order/submit-order-vet-clinic.dto";
import {CurrentUser} from "../../../shared/auth/guards/current-user.decorator";
import {User} from "../../../shared/user/entities/user.entity";
import {VetClinicOrderDto} from "./dto/vet-clinic-order-dto"; // مسیر ایمپورت را چک کنید

@ApiTags('Vet Clinic / Payment & Reservation')
@ApiBearerAuth()
@Controller('payments/vet-clinic')
export class VetClinicPaymentController {
    constructor(private readonly paymentService: VetClinicPaymentService) {}

    /**
     * ثبت نوبت و شروع فرآیند پرداخت
     * این متد هر دو حالت کیف پول و پرداخت آنلاین را هندل می‌کند.
     */
    @Post('submit')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'ثبت نوبت و ایجاد پرداخت',
        description: 'کاربر اطلاعات نوبت را ارسال می‌کند. اگر روش پرداخت آنلاین باشد، لینک پرداخت بازگردانده می‌شود.'
    })
    @ApiBody({ type: SubmitOrderVetClinicDto })
    @ApiCreatedResponse({ description: 'نوبت ثبت و پرداخت آغاز شد.' })
    async submitOrderAndPay(
        @Body() orderData: VetClinicOrderDto,
        @CurrentUser() user: User
    ) {
        return await this.paymentService.submitOrderAndPay(orderData, user.id);
    }

    /**
     * بررسی وضعیت پرداخت
     * برای پولینگ فرانت‌اند یا بررسی وضعیت نهایی
     */
    @Get(':paymentId/status')
    @ApiOperation({ summary: 'دریافت وضعیت پرداخت' })
    @ApiParam({ name: 'paymentId', type: 'string', description: 'شناسه پرداخت' })
    @ApiOkResponse({ description: 'وضعیت پرداخت بازگردانده شد.' })
    async getStatus(
        @Param('paymentId') paymentId: string,
        // @CurrentUser() user: User
        user: any
    ) {
        return await this.paymentService.getPaymentStatus(paymentId, user.id);
    }

    /**
     * لغو پرداخت در حال انتظار
     */
    @Post(':paymentId/cancel')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'لغو پرداخت در حال انتظار' })
    @ApiParam({ name: 'paymentId', type: 'string' })
    @ApiOkResponse({ description: 'پرداخت با موفقیت لغو شد.' })
    async cancelPayment(
        @Param('paymentId') paymentId: string,
        // @CurrentUser() user: User
        user: any
    ) {
        return await this.paymentService.cancelPayment(paymentId, user.id);
    }

    /**
     * [ادمین/فروشگاه] تایید دستی پرداخت
     * برای مواردی مثل پرداخت کارت به کارت یا نقدی که نیاز به تایید ادمین کلینیک دارد
     */
    @Post(':paymentId/confirm')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'تایید دستی پرداخت (فقط ادمین کلینیک)',
        description: 'برای تایید پرداخت‌های آفلاین توسط پنل مدیریت کلینیک استفاده می‌شود.'
    })
    @ApiParam({ name: 'paymentId', type: 'string' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                referenceId: { type: 'string', description: 'کد رهگیری تراکنش' }
            }
        }
    })
    @ApiOkResponse({ description: 'پرداخت تایید شد.' })
    async confirmPayment(
        @Param('paymentId') paymentId: string,
        @Body() body: { referenceId?: string }
    ) {
        return await this.paymentService.manualConfirmPayment(paymentId, body.referenceId);
    }
}