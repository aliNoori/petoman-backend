import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import {PharmacyReviewController} from "./pharmacy-review.controller";
import {PharmacyReviewService} from "./pharmacy-review.service";
import {Tenant} from "../../../../core/entities/tenant.entity";
import {TenantModule} from "../../../../tenants/tenant.module";
import {TenantReview} from "../../../../shared/reviews/tenant-review.entity";
import {JwtModule} from "@nestjs/jwt";
import {SessionModule} from "../../../../shared/user/session.module";

@Module({
    imports: [TypeOrmModule.forFeature([Tenant,TenantReview]),TenantModule,JwtModule,SessionModule],
    controllers: [PharmacyReviewController],
    providers: [PharmacyReviewService],
    exports: [PharmacyReviewService],
})
export class PharmacyReviewModule {}
