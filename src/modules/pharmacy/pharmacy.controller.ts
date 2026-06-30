import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from "../../shared/auth/guards/jwt-auth.guard";
import { TenantMembershipGuard } from "../../shared/auth/guards/tenant-membership.guard";
import { CapabilityGuard } from "../../shared/auth/guards/capability.guard";
import { Tenant } from "../../core/entities/tenant.entity";
import {TenantGuard} from "../../shared/auth/guards/tenant.guard";
import {Capabilities} from "../../shared/auth/decorators/capabilities.decorator";
import {PharmacyService} from "./pharmacy.service"; // ایمپورت Entity

@ApiTags('Pharmacy')
@ApiBearerAuth()
@UseGuards(
    JwtAuthGuard,
    TenantMembershipGuard,
    TenantGuard,
    CapabilityGuard,
)
@Capabilities('PRODUCT_MANAGEMENT')
@Controller('pharmacy')
export class PharmacyController {
    constructor(
        private readonly pharmacyService: PharmacyService
    ) {}

    @Get(':tenantId/pharmacy')
    @ApiOperation({ summary: 'دریافت اطلاعات فروشگاه' })
    @ApiResponse({
        status: 200,
        description: 'اطلاعات داروخانه با موفقیت دریافت شد.',
        type: Tenant // اضافه کردن تایپ برای مستندسازی Swagger
    })
    @ApiResponse({ status: 404, description: 'فروشگاه یافت نشد.' })
    getTenant(@Param('tenantId') tenantId: string) {
        return this.pharmacyService.getTenant(tenantId);
    }


}