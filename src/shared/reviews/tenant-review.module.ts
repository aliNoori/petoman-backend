import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import {Tenant} from "../../core/entities/tenant.entity";
import {TenantModule} from "../../tenants/tenant.module";
import {TenantReviewController} from "./tenant-review.controller";
import {TenantReviewService} from "./tenant-review.service";
import {JwtModule} from "@nestjs/jwt";
import {SessionModule} from "../user/session.module";

@Module({
    imports: [TypeOrmModule.forFeature([Tenant]),TenantModule,JwtModule,SessionModule],
    controllers: [TenantReviewController],
    providers: [TenantReviewService],
    exports: [TenantReviewService],
})
export class TenantReviewModule {}
