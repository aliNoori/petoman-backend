import { Module } from '@nestjs/common';
import { TenantContext } from './tenant-context.service';
import {TenantController} from "./tenant.controller";
import {TenantProvisioningService} from "./tenant-provisioning.service";
import {TenantMembershipService} from "./tenant-membership.service";
import {TenantService} from "./tenant.service";
import {TypeOrmModule} from "@nestjs/typeorm";
import {Tenant} from "../core/entities/tenant.entity";
import {ActivitiesLogModule} from "../shared/activities/activities-log.module";
import {JwtModule} from "@nestjs/jwt";
import {SessionModule} from "../shared/user/session.module";
import {AdminSettingModule} from "../shared/settings/admin-settings-module";

@Module({
    imports: [TypeOrmModule.forFeature([Tenant]),ActivitiesLogModule,JwtModule,SessionModule,AdminSettingModule],
    controllers:[TenantController],
    providers: [TenantProvisioningService,TenantMembershipService,TenantContext,TenantService],
    exports: [TenantContext,TenantProvisioningService,TenantMembershipService,TenantService],
})
export class TenantModule {}
