import {Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Req} from '@nestjs/common';
import {ApiTags, ApiOperation, ApiBearerAuth, ApiResponse} from '@nestjs/swagger';
import {UserTenantService} from "./user-tenant.service";
import {CreateRequestTenantDto} from "../dto/create-request-tenant.dto";
import {CurrentUser} from "../../auth/guards/current-user.decorator";
import {User} from "../../user/entities/user.entity";
import {UpdateRequestTenantDto} from "../dto/update-request-tenant.dto";
import {Tenant} from "../../../core/entities/tenant.entity";
import {CreateReviewDto} from "../../../modules/market/review/create-review.dto";
import {JoinQueueDto} from "../../../modules/vet&clinic/dto/join-queue.dto";
import {Request} from 'express';

@ApiTags('Tenants')
@ApiBearerAuth()
@Controller('user/tenants')
export class UserTenantController {
    constructor(
        private readonly tenantService: UserTenantService,
    ) {}

    @Get('allTenant')
    @ApiOperation({ summary: 'دریافت اطلاعات دامپزشک/کلینیک' })
    @ApiResponse({
        status: 200,
        description: 'اطلاعات دامپزشک/کلینیک با موفقیت دریافت شد.',
        type: Tenant // اضافه کردن تایپ برای مستندسازی Swagger
    })
    @ApiResponse({ status: 404, description: 'دامپزشک/کلینیک یافت نشد.' })
    getAllTenant() {
        return this.tenantService.findAllTenant();
    }

    @Get(':tenantId/bank-cards')
    @ApiOperation({summary: 'Get default card'})
    @ApiResponse({status: 200, description: 'Returns default card as an object.'})
    getDefaultCard(@Param('tenantId') tenantId:string) {
        return this.tenantService.getDefaultCard(tenantId);
    }

    @Get(':tenantId/settings')
    @ApiOperation({summary: 'Get all market settings'})
    @ApiResponse({status: 200, description: 'Returns all settings as an object.'})
    getAll(@Param('tenantId') tenantId:string) {
        return this.tenantService.getAllSettings(tenantId);
    }

    @Get()
    async findAll() {
        return this.tenantService.findAll();
    }

    @Post('requests')
    @ApiOperation({ summary: 'Request for create pet-tenant' })
    createRequestForTenant(@Body() dto: CreateRequestTenantDto,
                           @CurrentUser() user: User,
                           @Req() req: Request) {
        const deviceInfo = this.extractDeviceInfo(req);
        return this.tenantService.addRequestForTenant(dto, user,deviceInfo);
    }

    @Patch('requests/:id')
    @ApiOperation({ summary: 'Request for update pet-tenant' })
    updateRequestForTenant(@Param('id') id: string,
                         @Body() dto: UpdateRequestTenantDto,
                         @CurrentUser() user: User) {
        return this.tenantService.updateRequestForTenant(id,dto, user.id);
    }

    @Get('requests/me')
    @ApiOperation({ summary: 'Get all pet-tenant requests for user' })
    findAllRequestsMe(@CurrentUser() user:User) {
        return this.tenantService.findAllForMe(user.id);
    }

    @Get('specialties')
    @ApiOperation({ summary: 'Get tenant specialties' })
    findTenantSpecialties(@CurrentUser() user:User) {
        return this.tenantService.findTenantSpecialties();
    }

    @Get('services')
    @ApiOperation({ summary: 'Get tenant services' })
    findTenantServices(@CurrentUser() user:User) {
        return this.tenantService.findTenantServices();
    }

    @Get(':tenantId/reviews')
    @ApiOperation({
        summary: 'Submit review for shop',
    })
    getTenantAllReviews(
        @Param('tenantId') tenantId: string,
        @CurrentUser() user:User
    ) {
        return this.tenantService.getTenantAllReviews(tenantId);
    }

    /**
     * Submit review for a purchased shop
     */
    @Post(':tenantId/reviews')
    @ApiOperation({
        summary: 'Submit review for shop',
    })
    create(
        @Param('tenantId') tenantId: string,
        @Body() dto: CreateReviewDto,
        @CurrentUser() user:User
    ) {
        return this.tenantService.createReview(tenantId,user.id, dto);
    }

    /**
     * Get shop reviews
     */
    @Get('reviews/myReviews')
    @ApiOperation({
        summary: 'Get shop reviews',
    })
    list(@CurrentUser() user:User) {
        return this.tenantService.getAllTenantReviews(user.id);
    }

    /**
     * Get shop reviews
     */
    @Patch(':reviewId/reviews')
    @ApiOperation({
        summary: 'Update tenant reviews',
    })
    updateTenantReview(@Param('reviewId') reviewId: string,
                       @Body() dto: CreateReviewDto,
                       @CurrentUser() user:User) {
        return this.tenantService.updateTenantReview(reviewId,user.id,dto);
    }

    /**
     * Delete tenant review
     */
    @Delete(':reviewId/reviews')
    @ApiOperation({
        summary: 'Delete tenant review',
    })
    deleteTenantReview(@Param('reviewId') reviewId: string,
                       @CurrentUser() user: User) {
        return this.tenantService.deleteTenantReview(reviewId, user.id);
    }

    /////////////////============== Appointment =============///////

    @Get('appointments/my-list-appointments')
    @ApiOperation({ summary: 'Get all pet-tenant appointments for user' })
    findAllAppointmentsMe(@CurrentUser() user:User) {
        return this.tenantService.findAllForAppointmentsMe(user.id);
    }

    @Get('appointments/:appointmentId/me')
    @ApiOperation({ summary: 'Get by id appointments for user' })
    findAppointmentById(@CurrentUser() user:User) {
        return this.tenantService.findAppointmentById(user.id);
    }

    @Get('appointments/:tenantId/tenant-appointments')
    @ApiOperation({ summary: 'Get all tenant appointments' })
    getAllAppointmentsForTenant(
        @Param('tenantId') tenantId: string,
        @CurrentUser() user:User) {
        return this.tenantService.getAllAppointmentsForTenant(tenantId);
    }

    @Get('time-off/:tenantId/tenant-time-off')
    @ApiOperation({ summary: 'Get all tenant time-off' })
    getTimeOffBlocksForTenant(
        @Param('tenantId') tenantId: string,
        @CurrentUser() user:User) {
        return this.tenantService.getTimeOffBlocksForTenant(tenantId);
    }

    @Get(':tenantId/availability')
    @ApiOperation({ summary: 'بررسی وضعیت در دسترس بودن دامپزشک' })
    @ApiResponse({ status: 200, description: 'وضعیت در دسترس بودن' })
    @ApiResponse({ status: 404, description: 'دامپزشک یافت نشد' })
    getAvailability(
        @Param('tenantId') tenantId: string,
        @CurrentUser() user: User,
        @Query('serviceType') serviceType?: string,
    ) {
        return this.tenantService.getVetAvailability(tenantId, serviceType, user?.id);
    }

    // ═══════════════════════════════════════════════════════
    // 🆕 ایندپوینت‌های مدیریت صف
    // ═══════════════════════════════════════════════════════

    /**
     * _ورود به صف انتظار_
     */
    @Post(':tenantId/queue')
    @ApiOperation({ summary: 'ورود به صف انتظار' })
    @ApiResponse({ status: 201, description: 'با موفقیت وارد صف شدید' })
    @ApiResponse({ status: 400, description: 'امکان ورود به صف وجود ندارد' })
    joinQueue(
        @Param('tenantId') tenantId: string,
        @Body() dto: JoinQueueDto,
        @CurrentUser() user: User,
    ) {
        return this.tenantService.joinQueue(tenantId, user.id, dto.serviceType,dto.orderId);
    }

    /**
     * _دریافت وضعیت صف خود کاربر_
     */
    @Get('queue/status')
    @ApiOperation({ summary: 'دریافت وضعیت صف کاربر' })
    @ApiResponse({ status: 200, description: 'وضعیت صف کاربر' })
    getQueueStatus(
        @CurrentUser() user: User,
        @Query('tenantId') tenantId: string,
    ) {
        return this.tenantService.getUserQueueStatus(user.id, tenantId);
    }

    /**
     * _دریافت لیست صف انتظار (برای نمایش)_
     */
    @Get(':tenantId/queue')
    @ApiOperation({ summary: 'دریافت لیست صف انتظار' })
    @ApiResponse({ status: 200, description: 'لیست صف انتظار' })
    getQueueList(
        @Param('tenantId') tenantId: string,
        @Query('serviceType') serviceType?: string,
        @CurrentUser() user?: User,
    ) {
        return this.tenantService.getQueueList(tenantId, serviceType, user?.id);
    }

    /**
     * _خروج از صف_
     */
    @Delete('queue/:orderId')
    @ApiOperation({ summary: 'خروج از صف انتظار' })
    @ApiResponse({ status: 200, description: 'با موفقیت از صف خارج شدید' })
    leaveQueue(
        @Param('orderId') orderId: string,
        @CurrentUser() user: User,
    ) {
        return this.tenantService.leaveQueue(orderId, user.id);
    }

    @Patch(':orderId/cancel-order-by-user')
    @ApiOperation({ summary: 'لفو یک سفارش خاص' })
    async cancelOrderByUser(@Param('orderId') orderId: string, @Req() req) {
        const userId = req.user.id;
        return this.tenantService.cancelOrderByUser(orderId, userId);
    }

    @Get('/categories/with-products')
    @ApiOperation({ summary: 'Get all categories with products' })
    findAllWithTenantProduct(
        @Param('tenantType') tenantType: string,
    ) {
        return this.tenantService.getCategoryWithProducts(tenantType);
    }

    private extractDeviceInfo(req: Request): { ip: string; userAgent: string } {
        // نکته مهم: برای دریافت IP واقعی، باید در main.ts app.enableTrustProxy() را صدا زده باشید
        // اگر پشت NGINX/Cloudflare هستید، req.ip یا req.ips کار می‌کند.
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';

        return {ip, userAgent};
    }
}