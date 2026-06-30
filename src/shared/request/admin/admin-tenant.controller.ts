import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Request,
    Query,
    DefaultValuePipe, ParseIntPipe
} from '@nestjs/common';
import {ApiTags, ApiOperation, ApiBearerAuth, ApiResponse} from '@nestjs/swagger';

import {AdminTenantService} from "./admin-tenant.service";
import {JwtAuthGuard} from "../../auth/guards/jwt-auth.guard";
import {AdminGuard} from "../../auth/guards/admin-guard";
import {TenantService} from "../../../tenants/tenant.service";
import {Permissions} from "../../auth/decorators/permissions.decorator";
import {CurrentUser} from "../../auth/guards/current-user.decorator";
import {User} from "../../user/entities/user.entity";
import {ReasonDto} from "../dto/reason.dto";
import {ProcessServiceDto} from "../dto/process-service.dto";
import {Tenant} from "../../../core/entities/tenant.entity";
import {ListOrdersQuery} from "../../order/list-orders.query";
import {AdminReasonDto} from "../../../modules/market/admin/products/dto/admin.reason.dto";
import {CreateReviewDto} from "../../../modules/market/review/create-review.dto";

@ApiTags('Admin / Tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard,AdminGuard)
@Permissions('tenant.manage')

@Controller('admin/tenants')
export class AdminTenantController {
    constructor(
        private readonly tenantService: TenantService,
        private readonly adminTenantService: AdminTenantService,
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
        return this.adminTenantService.findAllTenant();
    }

    // --- Shop Requests Management ---
    @Get('all-orders')
    @ApiOperation({ summary: 'Get all tenant orders' })
    findAllOrders(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
    ) {
        const query: ListOrdersQuery = {
            page,
            limit
        };
        return this.adminTenantService.findAllOrders(query);
    }

    // --- Shop Requests Management ---
    @Get('requests')
    @ApiOperation({ summary: 'Get all tenant requests' })
    findAllRequests() {
        return this.adminTenantService.findAll();
    }

    @Get('requests/:id')
    @ApiOperation({ summary: 'Get a tenant request by ID' })
    findOneRequest(@Param('id') id: string) {
        return this.adminTenantService.findOne(id);
    }

    @Patch('requests/:id/approve')
    @ApiOperation({ summary: 'Approve a tenant request and create Tenant' })
    approveRequest(@Param('id') id: string,@CurrentUser() admin:User) {
        return this.adminTenantService.approveTenantRequest(id,admin.id);
    }
    @Patch('requests/:id/revision')
    @ApiOperation({ summary: 'Request revision for a tenant request' })
    revisionRequest(@Param('id') id: string, @Body() reasonDto: ReasonDto) {
        // ارسال reason به سرویس
        return this.adminTenantService.revisionTenantRequest(id, reasonDto.reason);
    }

    @Patch('requests/:id/reject')
    @ApiOperation({ summary: 'Reject a tenant request' })
    rejectRequest(@Param('id') id: string, @Body() reasonDto: ReasonDto) {
        // ارسال reason به سرویس
        return this.adminTenantService.rejectTenantRequest(id, reasonDto.reason);
    }

    // --- Settings Change Requests Management ---

    @Get('settings-requests')
    @ApiOperation({ summary: 'دریافت لیست درخواست‌های تغییر تنظیمات در انتظار تایید' })
    getPendingSettingsRequests() {
        // فرض بر این است که سرویس متد getPendingChangeRequests را دارد
        // اگر نیاز به فیلتر کردن بر اساس tenantId خاصی دارید، آن را به عنوان پارامتر بفرستید
        return this.adminTenantService.getPendingChangeRequests();
    }

    @Patch('settings-requests/:id/process')
    @ApiOperation({ summary: 'تایید یا رد کردن درخواست تغییر تنظیمات' })
    processSettingsRequest(
        @Param('id') id: string,
        @Body() body: { isApproved: boolean; reason?: string }
    ) {
        const { isApproved, reason } = body;
        return this.adminTenantService.processChangeRequest(id, isApproved, reason);
    }

    ///////////////===============SERVICE===========///////

    @Get('services/pending')
    @ApiOperation({ summary: 'دریافت لیست خدمات در انتظار تایید' })
    getPendingServices() {
        // فرض بر این است که متدی در سرویس برای فیلتر کردن وجود دارد
        return this.adminTenantService.getPendingServices();
    }

    @Patch('services/:id/process')
    @ApiOperation({ summary: 'تایید یا رد کردن درخواست وضعیت سرویس' })
    processServiceStatus(
        @Param('id') id: string,
        @Body() processDto: ProcessServiceDto
    ) {
        return this.adminTenantService.processServiceStatus(id, processDto);
    }


    // --- Medicine Management (Existing) ---
    @Get('/pending/medicines')
    @ApiOperation({ summary: 'Get all pending medicines' })
    findAllPendingMedicines() {
        return this.adminTenantService.findAllPendingMedicines();
    }

    @Patch('medicines/:id/approve')
    @ApiOperation({ summary: 'Approve a medicine request and verified it' })
    approveMedicine(@Param('id') id: string) {
        return this.adminTenantService.approveMedicine(id);
    }

    @Patch('medicines/:id/revision')
    @ApiOperation({ summary: 'Medicine revision' })
    revisionMedicine(@Param('id') id: string, @Body() reasonDto: AdminReasonDto) {

        return this.adminTenantService.revisionMedicine(id, reasonDto.reason);
    }

    @Patch('medicines/:id/reject')
    @ApiOperation({ summary: 'Reject a new medicine request' })
    rejectMedicine(@Param('id') id: string, @Body() reasonDto: AdminReasonDto) {
        return this.adminTenantService.rejectMedicine(id, reasonDto.reason);
    }


    /**
     * تغییر وضعیت محدودیت (Suspend/Unsuspend) فروشگاه
     */
    @Patch(':id/suspend')
    @ApiOperation({ summary: 'Toggle suspend status for a tenant' })
    @ApiBearerAuth()
    async toggleTenantSuspend(
        @Param('id') id: string,
        @Body() body: { isSuspended: boolean }
    ) {
        return this.adminTenantService.toggleTenantSuspension(id, body.isSuspended);
    }

}