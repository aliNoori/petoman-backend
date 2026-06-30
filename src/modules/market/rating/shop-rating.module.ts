import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import {TenantModule} from "../../../tenants/tenant.module";
import {Tenant} from "../../../core/entities/tenant.entity";
import {ShopRatingController} from "./shop-rating.controller";
import {ShopRatingService} from "./shop-rating.service";

@Module({
    imports: [TypeOrmModule.forFeature([Tenant])],
    controllers: [ShopRatingController],
    providers: [ShopRatingService],
    exports: [ShopRatingService],
})
export class ShopRatingModule {}
