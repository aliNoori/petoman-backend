import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import {PharmacyProductReviewController} from "./pharmacy-review-product.controller";
import {PharmacyProductReviewService} from "./pharmacy-review-product.service";
import {ProductReview} from "../../../market/review/product-review.entity";
import {TenantModule} from "../../../../tenants/tenant.module";
import {JwtModule} from "@nestjs/jwt";
import {SessionModule} from "../../../../shared/user/session.module";

@Module({
    imports: [TypeOrmModule.forFeature([ProductReview]),TenantModule,JwtModule,SessionModule],
    controllers: [PharmacyProductReviewController],
    providers: [PharmacyProductReviewService],
    exports: [PharmacyProductReviewService],
})
export class PharmacyReviewProductModule {}
