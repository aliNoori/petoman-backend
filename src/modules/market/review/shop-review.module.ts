import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import {Tenant} from "../../../core/entities/tenant.entity";
import {ShopReviewController} from "./shop-review.controller";
import {ShopReviewService} from "./shop-review.service";
import {TenantModule} from "../../../tenants/tenant.module";
import {JwtModule} from "@nestjs/jwt";
import {SessionModule} from "../../../shared/user/session.module";

@Module({
    imports: [TypeOrmModule.forFeature([Tenant]),TenantModule,JwtModule,SessionModule],
    controllers: [ShopReviewController],
    providers: [ShopReviewService],
    exports: [ShopReviewService],
})
export class ShopReviewModule {}
