import {Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request} from '@nestjs/common';
import {ApiTags, ApiOperation, ApiBearerAuth, ApiResponse} from '@nestjs/swagger';
import { TenantService } from "../../../../tenants/tenant.service";
import { JwtAuthGuard } from "../../../../shared/auth/guards/jwt-auth.guard";
import {ReasonDto} from "./dto/reason.dto";
import {AdminShopService} from "./admin-shop.service";
import {AdminGuard} from "../../../../shared/auth/guards/admin-guard";
import {CurrentUser} from "../../../../shared/auth/guards/current-user.decorator";
import {User} from "../../../../shared/user/entities/user.entity";
import {Permissions} from "../../../../shared/auth/decorators/permissions.decorator";
import {UpdateWithdrawalStatusDto} from "../../request/dto/update-withdrawal-status.dto";

@ApiTags('Market / Shops')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard,AdminGuard)
@Permissions('tenant.manage')

@Controller('admin/shops')
export class AdminShopController {
    constructor(
        private readonly tenantService: TenantService,
        private readonly shopService: AdminShopService,
    ) {}

    // --- Tenant Management (Existing) ---
    @Get('tenants')
    @ApiOperation({ summary: 'Get all tenants' })
    async findAllTenants() {
        return await this.tenantService.findAll();
    }

    @Get('tenants/:id')
    @ApiOperation({ summary: 'Get a tenant by ID' })
    async findOneTenant(@Param('id') id: string) {
        return await this.tenantService.findOne(id);
    }

    // --- Shop Requests Management ---
    @Get('requests')
    @ApiOperation({ summary: 'Get all shop requests' })
    async findAllRequests() {
        return await this.shopService.findAll();
    }

    @Get('requests/:id')
    @ApiOperation({ summary: 'Get a shop request by ID' })
    async findOneRequest(@Param('id') id: string) {
        return await this.shopService.findOne(id);
    }

    @Patch('requests/:id/approve')
    @ApiOperation({ summary: 'Approve a shop request and create Tenant' })
    async approveRequest(@Param('id') id: string,@CurrentUser() admin:User) {
        return await this.shopService.approveShopRequest(id,admin.id);
    }
    @Patch('requests/:id/revision')
    @ApiOperation({ summary: 'Request revision for a shop request' })
    async revisionRequest(@Param('id') id: string, @Body() reasonDto: ReasonDto) {
        // ارسال reason به سرویس
        return await this.shopService.revisionShopRequest(id, reasonDto.reason);
    }

    @Patch('requests/:id/reject')
    @ApiOperation({ summary: 'Reject a shop request' })
    async rejectRequest(@Param('id') id: string, @Body() reasonDto: ReasonDto) {
        // ارسال reason به سرویس
        return await this.shopService.rejectShopRequest(id, reasonDto.reason);
    }


    /**
     * دریافت لیست تمام درخواست‌های تغییر اطلاعات فروشگاه در انتظار تایید
     */
    @Get('settings/pending-changes')
    @ApiOperation({ summary: 'Get all pending shop info changes (Admin Only)' })
    @ApiResponse({ status: 200, description: 'Returns list of pending requests.' })
    async getPendingChanges() {
        return await this.shopService.getPendingShopInfoChanges();
    }

    /**
     * تایید، رد یا درخواست اصلاح تغییرات اطلاعات فروشگاه توسط مدیر
     * @param body شامل tenantId، status و reason (اختیاری)
     */
    @Post('settings/approve-change')
    @ApiOperation({ summary: 'Approve, reject or request correction for pending shop info changes (Admin Only)' })
    @ApiResponse({ status: 200, description: 'Changes processed successfully.' })
    async approveChange(
        @Body() body: { tenantId: string; status: 'approved' | 'rejected' | 'correction_required'; reason?: string }
    ) {
        return await this.shopService.approveShopInfoChange(body.tenantId, body.status, body.reason);
    }

    // --- Review Management ---
    @Get('reviews/pending')
    @ApiOperation({ summary: 'Get all pending reviews' })
    async findAllPendingReviews() {

        return await this.shopService.findAllPendingReviews();
    }

    /**
     * تایید نظر
     */
    @Patch('reviews/:reviewId/approve')
    @ApiOperation({ summary: 'Approve a review' })
    async approveReview(@Param('reviewId') reviewId: string) {
        return await this.shopService.approveReview(reviewId);
    }

    /**
     * رد نظر
     */
    @Patch('reviews/:reviewId/reject')
    @ApiOperation({ summary: 'Reject a review' })
    async rejectReview(@Param('reviewId') reviewId: string) {
        return await this.shopService.rejectReview(reviewId);
    }

    // --- Shop Suspension Management ---

    /**
     * تغییر وضعیت محدودیت (Suspend/Unsuspend) فروشگاه
     */
    @Patch('tenants/:id/suspend')
    @ApiOperation({ summary: 'Toggle suspend status for a tenant' })
    @ApiBearerAuth()
    async toggleSuspend(
        @Param('id') id: string,
        @Body() body: { isSuspended: boolean }
    ) {
        return await this.shopService.toggleTenantSuspension(id, body.isSuspended);
    }

    @Get('withdrawals')
    async findAll() {
        return await this.shopService.findAllWithdrawals();
    }

    @Patch('withdrawals/:id')
    @UseGuards(AdminGuard)
    @Permissions('tenant.manage')
    async updateStatus(
        @Param('id') id: string,
        @Body() updateWithdrawalStatusDto: UpdateWithdrawalStatusDto
    ) {
        return await this.shopService.updateWithdrawalStatus(
            id,
            updateWithdrawalStatusDto.status,
            updateWithdrawalStatusDto.rejectionReason,
            updateWithdrawalStatusDto.trackId,      // اضافه شده
            updateWithdrawalStatusDto.paidAt        // اضافه شده
        );
    }


}