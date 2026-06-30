import {
    BadRequestException,Body,Controller,Delete,Get,Param,Patch,Post,Put,Query,Request,
    UseGuards} from '@nestjs/common';

import {Permissions} from "../../shared/auth/decorators/permissions.decorator";
import {JwtAuthGuard} from "../../shared/auth/guards/jwt-auth.guard";
import {TenantMembershipGuard} from "../../shared/auth/guards/tenant-membership.guard";
import {TenantGuard} from "../../shared/auth/guards/tenant.guard";
import {CapabilityGuard} from "../../shared/auth/guards/capability.guard";
import {VetClinicService} from "./clinic.service";
import {Capabilities} from "../../shared/auth/decorators/capabilities.decorator";
import {ApiBody, ApiOperation, ApiResponse} from "@nestjs/swagger";
import {Tenant} from "../../core/entities/tenant.entity";
import {UpdatePricingDto, UpdateVetClinicInfoDto} from "../../shared/request/dto/tenant-settings.dto";
import {ChangePasswordDto} from "../../shared/user/dto/password.dto";
import {CreateServiceDto, UpdateServiceDto} from "./dto/vet-clinic-service.dto";
import {VerifyExamCodeDto} from "./dto/verify-exam-code.dto";
import {ChangeAppointmentStatusDto} from "./dto/change-status-appointment-dto";
import {CreateTimeOffDto} from "./dto/time-off.dto";
import {AppointmentType} from "./entities/appointment.entity";

@UseGuards(
    JwtAuthGuard,
    TenantMembershipGuard,
    TenantGuard,
    CapabilityGuard,
)
@Capabilities('APPOINTMENT_MANAGEMENT')
@Permissions('doctors.manage')
@Controller('vetClinic')
export class VetClinicController {
    constructor(private readonly vetClinicService: VetClinicService) {}

    @Get(':tenantId')
    @ApiOperation({ summary: 'دریافت اطلاعات دامپزشک/کلینیک' })
    @ApiResponse({
        status: 200,
        description: 'اطلاعات دامپزشک/کلینیک با موفقیت دریافت شد.',
        type: Tenant // اضافه کردن تایپ برای مستندسازی Swagger
    })
    @ApiResponse({ status: 404, description: 'دامپزشک/کلینیک یافت نشد.' })
    async getTenant() {
        return await this.vetClinicService.getTenant();
    }

    @Get('medicines/global-medicines')
    async findAllGlobalMedicine(){
        return await this.vetClinicService.findAllGlobalMedicine()
    }


    ////////////////================   SETTINGS  ================/////////
    @Get('/settings/all')
    @ApiOperation({ summary: 'دریافت تمام تنظیمات کلینیک' })
    @ApiResponse({ status: 200, description: 'تنظیمات با موفقیت دریافت شد.' })
    async getAllSettings(@Request() req) {
        // فرض بر این است که tenantId از توکن یا Guard استخراج شده و در req.user یا req.tenant موجود است
        return await this.vetClinicService.getAllSettings();
    }

    @Put('settings/info')
    @ApiOperation({ summary: 'بروزرسانی اطلاعات عمومی کلینیک' })
    @ApiBody({ type: UpdateVetClinicInfoDto })
    @ApiResponse({ status: 200, description: 'اطلاعات عمومی با موفقیت بروزرسانی شد.' })
    async updateClinicInfo(@Request() req, @Body() updateClinicInfoDto: UpdateVetClinicInfoDto) {
        return await this.vetClinicService.requestUpdateClinicInfo(updateClinicInfoDto);
    }

    @Put('settings/pricing')
    @ApiOperation({ summary: 'بروزرسانی قیمت‌گذاری ویزیت‌ها و تماس‌ها' })
    @ApiBody({ type: UpdatePricingDto })
    @ApiResponse({ status: 200, description: 'قیمت‌ها با موفقیت ذخیره شدند.' })
    async updatePricing(@Request() req, @Body() updatePricingDto: UpdatePricingDto) {
        // در سرویس باید این دو بخش را جداگانه یا با هم ذخیره کنیم
        return await this.vetClinicService.requestUpdatePricing(updatePricingDto);
    }

    @Post('settings/change-password')
    @ApiOperation({ summary: 'تغییر رمز عبور' })
    @ApiBody({ type: ChangePasswordDto })
    @ApiResponse({ status: 200, description: 'رمز عبور با موفقیت تغییر کرد.' })
    @ApiResponse({ status: 400, description: 'رمز عبور فعلی اشتباه است.' })
    async changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto) {
        const userId = req.user?.id; // فرض بر این است که ID کاربر در req.user است
        return await this.vetClinicService.changePassword(userId, changePasswordDto);
    }

    ////////////////================   SERVICES  ================/////////

    @Get('tenants/services')
    @ApiOperation({ summary: 'دریافت لیست خدمات کلینیک' })
    @ApiResponse({ status: 200, description: 'لیست خدمات دریافت شد.' })
    async getServices(@Request() req) {
        return await this.vetClinicService.getServices();
    }

    @Post('tenants/services')
    @ApiOperation({ summary: 'افزودن خدمت جدید' })
    @ApiBody({ type: CreateServiceDto })
    @ApiResponse({ status: 201, description: 'خدمت جدید ایجاد شد.' })
    async createService(@Request() req, @Body() createServiceDto: CreateServiceDto) {

        return await this.vetClinicService.createService(createServiceDto);
    }

    @Put('tenants/services/:id')
    @ApiOperation({ summary: 'ویرایش خدمت' })
    @ApiBody({ type: UpdateServiceDto })
    @ApiResponse({ status: 200, description: 'خدمت ویرایش شد.' })
    async updateService(
        @Param('id') id: string,
        @Body() updateServiceDto: UpdateServiceDto
    ) {
        return await this.vetClinicService.updateService(id, updateServiceDto);
    }

    @Delete('tenants/services/:id')
    @ApiOperation({ summary: 'حذف خدمت' })
    @ApiResponse({ status: 200, description: 'خدمت حذف شد.' })
    async deleteService(@Param('id') id: string) {
        return await this.vetClinicService.deleteService(id);
    }


    ////////////////================   Appointment  ================/////////

    @Get('appointments/tenants/my-list')
    @ApiOperation({ summary: 'دریافت نوبت های دامپزشک/کلینیک' })
    @ApiResponse({
        status: 200,
        description: 'نوبت های دامپزشک/کلینیک با موفقیت دریافت شد.',
        type: Tenant // اضافه کردن تایپ برای مستندسازی Swagger
    })
    @ApiResponse({ status: 404, description: 'دامپزشک/کلینیک یافت نشد.' })
    async getTenantAppointments() {
        return await this.vetClinicService.findAllTenantAppointment();
    }

    @Patch('tenants/appointments/status/:id')
    @ApiOperation({ summary: 'تغییر وضعیت نوبت های دامپزشک/کلینیک' })
    @ApiResponse({
        status: 200,
        description: 'نوبت های دامپزشک/کلینیک با موفقیت وضعیت تغییر یافت.',
        type: Tenant // اضافه کردن تایپ برای مستندسازی Swagger
    })
    @ApiResponse({ status: 404, description: 'دامپزشک/کلینیک یافت نشد.' })
    @Patch('tenants/appointments/status/:id')
    async changeStatusTenantAppointments(
        @Param('id') id: string,
        @Body() changeStatusDto: ChangeAppointmentStatusDto // کل بدنه را می‌گیرد
    ) {
        return await this.vetClinicService.changeStatusTenantAppointment(id, changeStatusDto);
    }

    @Patch('tenants/appointments/:id/verify-exam-code')
    async verifyExamCode(
        @Param('id') appointmentId: string,
        @Body() verifyExamCodeDto: VerifyExamCodeDto
    ) {
        return await this.vetClinicService.verifyExamCode(appointmentId, verifyExamCodeDto);
    }



    //////////////////////==========Consultation========/////////
    // لیست مشاوره‌های دکتر (اگر دکتر لاگین است)
    @Get('tenants/consultations')
    async findTenantConsultations() {
        // فرض بر این است که در JWT چک شده که کاربر دکتر است یا نقشش را چک می‌کنید
        return await this.vetClinicService.findAllConsultationsForTenant();
    }


    @Patch('tenants/consultations/:id')
    @ApiOperation({ summary: 'تغییر وضعیت اتاق مشاوره' })
    @ApiResponse({
        status: 200,
        description: 'اتاق با موفقیت وضعیت تغییر یافت.',
        type: Tenant // اضافه کردن تایپ برای مستندسازی Swagger
    })
    @ApiResponse({ status: 404, description: 'اتاق یافت نشد.' })
    async activeTenantConsultation(@Param('id') id: string) {
        return await this.vetClinicService.activeTenantConsultation(id);
    }

    /////////////////===== Reviews ========////////////////

    @Get('tenants/reviews')
    @ApiOperation({ summary: 'دریافت لیست نظرات مربوط به تننت جاری' })
    @ApiResponse({ status: 200, description: 'لیست نظرات بازگردانده شد.' })
    async findTenantReviews() {
        // فرض بر این است که در JWT چک شده که کاربر دکتر است یا نقشش را چک می‌کنید
        return await this.vetClinicService.findAllReviewsForTenant();
    }

    @Patch('tenants/reviews/:id/reply')
    @ApiOperation({ summary: 'پاسخ به یک نظر خاص توسط تننت' })
    @ApiResponse({
        status: 200,
        description: 'پاسخ با موفقیت ثبت شد.',
        type: Object // یا یک DTO مناسب برای خروجی
    })
    @ApiResponse({ status: 404, description: 'نظر یافت نشد.' })
    async replyTenantReview(
        @Param('id') id: string,
        @Body('reply') replyText: string // دریافت متن پاسخ از بدنه درخواست
    ) {
        return await this.vetClinicService.replyTenantReview(id, replyText);
    }

    ////////////////======= Time Off Tenant

    @Post('tenants/time-off')
    async addTimeOff(@Body() dto: CreateTimeOffDto) {
        return this.vetClinicService.addTimeOffBlock(dto);
    }

    @Get('tenants/time-off')
    async getTimeOffs() {
        return this.vetClinicService.getTimeOffBlocks();
    }

    @Delete('tenants/time-off/:id')
    async deleteTimeOff(@Param('id') id: string) {
        return this.vetClinicService.deleteTimeOffBlock(id);
    }

    // --- Capacity Management ---

    @Get('tenants/capacity/stats')
    @ApiOperation({ summary: 'دریافت آمار ظرفیت مشاوره‌ها' })
    @ApiResponse({ status: 200, description: 'آمار ظرفیت دریافت شد.' })
    async getCapacityStats() {
        return await this.vetClinicService.getCapacityStats();
    }

    @Get('tenants/capacity/settings')
    @ApiOperation({ summary: 'دریافت تنظیمات ظرفیت' })
    @ApiResponse({ status: 200, description: 'تنظیمات ظرفیت دریافت شد.' })
    async getCapacitySettings() {
        return await this.vetClinicService.getCapacitySettings();
    }

    @Put('tenants/capacity/settings')
    @ApiOperation({ summary: 'به‌روزرسانی تنظیمات ظرفیت' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                chatCapacity: { type: 'number', example: 2 },
                phoneInstantCapacity: { type: 'number', example: 1 },
                phoneScheduledCapacity: { type: 'number', example: 2 },
                chatEnabled: { type: 'boolean', example: true },
                phoneInstantEnabled: { type: 'boolean', example: true },
                phoneScheduledEnabled: { type: 'boolean', example: true },
                defaultConsultationDuration: { type: 'number', example: 15 },
                maxQueueWaitTime: { type: 'number', example: 30 },
                doNotDisturb: { type: 'boolean', example: false }
            }
        }
    })
    @ApiResponse({ status: 200, description: 'تنظیمات با موفقیت بروزرسانی شد.' })
    async updateCapacitySettings(@Body() dto: any) {
        return await this.vetClinicService.updateCapacitySettings(dto);
    }

    @Post('tenants/capacity/toggle-dnd')
    @ApiOperation({ summary: 'تغییر حالت مزاحم نشوید' })
    @ApiResponse({ status: 200, description: 'حالت با موفقیت تغییر کرد.' })
    async toggleDoNotDisturb(@Request() req, @Body('doNotDisturb') doNotDisturb: boolean) {
        return await this.vetClinicService.updateCapacitySettings({ doNotDisturb: doNotDisturb });
    }

    @Post('tenants/capacity/set-online')
    @ApiOperation({ summary: 'تنظیم وضعیت آنلاین/آفلاین' })
    @ApiResponse({ status: 200, description: 'وضعیت با موفقیت تغییر کرد.' })
    async setOnlineStatus(@Request() req, @Body('isOnline') isOnline: boolean) {
        return await this.vetClinicService.setOnlineStatus(isOnline);
    }

    // --- Queue Management ---

    @Get('tenants/queue')
    @ApiOperation({ summary: 'دریافت لیست صف انتظار' })
    @ApiResponse({ status: 200, description: 'لیست صف دریافت شد.' })
    async getQueueList(
        @Query('serviceType') serviceType?: AppointmentType
    ) {
        return await this.vetClinicService.getQueueList(serviceType);
    }

    @Post('tenants/queue/:appointmentId/start')
    @ApiOperation({ summary: 'شروع مشاوره برای نفر بعدی در صف' })
    @ApiResponse({ status: 200, description: 'مشاوره شروع شد.' })
    async startNextInQueue(@Param('appointmentId') appointmentId: string) {
        return await this.vetClinicService.startNextInQueue(appointmentId);
    }

    @Delete('tenants/queue/:appointmentId')
    @ApiOperation({ summary: 'حذف یک نفر از صف' })
    @ApiResponse({ status: 200, description: 'از صف حذف شد.' })
    async removeFromQueue(@Param('appointmentId') appointmentId: string) {
        return await this.vetClinicService.removeFromQueue(appointmentId);
    }

    ////////////////================   Instant Requests  ================/////////

    @Post('tenants/instant-requests/:requestId/accept')
    @ApiOperation({ summary: 'پذیرش درخواست فوری' })
    @ApiResponse({ status: 200, description: 'درخواست فوری با موفقیت پذیرفته شد.' })
    async acceptInstantRequest(
        @Param('requestId') requestId: string,
        @Request() req
    ) {
        // فرض بر این است که doctorId از توکن استخراج شده است
        return this.vetClinicService.acceptInstantRequest(requestId);
    }

    @Post('tenants/instant-requests/:requestId/reject')
    @ApiOperation({ summary: 'رد درخواست فوری' })
    @ApiBody({ schema: { properties: { reason: { type: 'string', example: 'علت رد درخواست' } } } })
    @ApiResponse({ status: 200, description: 'درخواست فوری با موفقیت رد شد.' })
    async rejectInstantRequest(
        @Param('requestId') requestId: string,
        @Body('reason') reason: string,
        @Request() req
    ) {
        return this.vetClinicService.rejectInstantRequest(requestId, reason);
    }

    /////////////////===========    FINANCE   ==========///////////

    @Get('tenants/finance/revenue')
    @ApiOperation({ summary: 'دریافت کل درآمد ناخالص (پرداخت‌های موفق)' })
    @ApiResponse({
        status: 200,
        description: 'کل درآمد با موفقیت محاسبه شد.',
        schema: {
            example: {
                total: 33333.00
            }
        }
    })
    async getTotalPaidRevenue(@Request() req) {
        // فراخوانی متد از سرویس
        const total = await this.vetClinicService.getTotalPaidRevenue();
        return { total };
    }

    @Get('tenants/finance/reports')
    @ApiOperation({ summary: 'دریافت گزارش درآمد بازه‌ای (روزانه، هفتگی، ماهانه، سه ماه اخیر)' })
    @ApiResponse({ status: 200, description: 'گزارش درآمد با موفقیت دریافت شد.' })
    async getRevenueReport(
        @Request() req,
        @Query('period') period: 'daily' | 'weekly' | 'monthly' | 'quarterly' = 'monthly'
    ) {
        // اعتبارسنجی ورودی
        const allowedPeriods = ['daily', 'weekly', 'monthly', 'quarterly'];
        if (!allowedPeriods.includes(period)) {
            throw new BadRequestException('Invalid period. Use: daily, weekly, monthly, quarterly');
        }

        // فراخوانی متد جدید از سرویس
        return await this.vetClinicService.getRevenueByPeriod(period);
    }
}