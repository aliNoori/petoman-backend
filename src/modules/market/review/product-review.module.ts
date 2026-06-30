import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import {TenantModule} from "../../../tenants/tenant.module";
import {ProductReviewController} from "./product-review.controller";
import {ProductReviewService} from "./product-review.service";
import {ProductReview} from "./product-review.entity";
import {JwtModule} from "@nestjs/jwt";
import {SessionModule} from "../../../shared/user/session.module";

@Module({
    imports: [TypeOrmModule.forFeature([ProductReview]),TenantModule,JwtModule,SessionModule],
    controllers: [ProductReviewController],
    providers: [ProductReviewService],
    exports: [ProductReviewService],
})
export class ProductReviewModule {}
