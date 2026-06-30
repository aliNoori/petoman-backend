// src/tenant/tenant.controller.ts
import {Controller, Post, Body, UseGuards, Req} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../shared/auth/guards/jwt-auth.guard';
import { TenantProvisioningService } from './tenant-provisioning.service';
import { TenantType } from '../core/entities/tenant.entity';
import {CurrentUser} from "../shared/auth/guards/current-user.decorator";
import {User} from "../shared/user/entities/user.entity";
import {BlacklistGuard} from "../shared/auth/guards/blacklist.guard";

@ApiTags('Tenant')
@ApiBearerAuth()
@Controller('tenants')
export class TenantController {
    constructor(private tenantProvisioning: TenantProvisioningService) {}

    @Post()
    @UseGuards(JwtAuthGuard,BlacklistGuard)
    @ApiBody({
        schema: {
            properties: {
                name: { type: 'string' },
                type: { enum: Object.values(TenantType) },
            },
        },
    })
    createTenant(@Body() body: any, @CurrentUser() user:User) {

        const adminId=''//TODO:set next

        return this.tenantProvisioning.provisionTenant(
            adminId,
            user,
            user.id,
            body.name,
            body.type,
        );
    }
}