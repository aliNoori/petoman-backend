import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { MarketService } from "./market.service";
import { JwtAuthGuard } from "../../shared/auth/guards/jwt-auth.guard";
import { TenantMembershipGuard } from "../../shared/auth/guards/tenant-membership.guard";
import { CapabilityGuard } from "../../shared/auth/guards/capability.guard";
import { Tenant } from "../../core/entities/tenant.entity";
import {TenantGuard} from "../../shared/auth/guards/tenant.guard";
import {Capabilities} from "../../shared/auth/decorators/capabilities.decorator"; // ایمپورت Entity

@ApiTags('Market')
@ApiBearerAuth()
@UseGuards(
    JwtAuthGuard,
    TenantMembershipGuard,
    TenantGuard,
    CapabilityGuard,
)
@Capabilities('PRODUCT_MANAGEMENT')
@Controller('market')
export class MarketController {
    constructor(
        private readonly marketService: MarketService
    ) {}

    @Get(':tenantId')
    @ApiOperation({ summary: 'دریافت اطلاعات فروشگاه' })
    @ApiResponse({
        status: 200,
        description: 'اطلاعات فروشگاه با موفقیت دریافت شد.',
        type: Tenant // اضافه کردن تایپ برای مستندسازی Swagger
    })
    @ApiResponse({ status: 404, description: 'فروشگاه یافت نشد.' })
    getTenant(@Param('tenantId') tenantId: string) {
        return this.marketService.getTenant(tenantId);
    }


}