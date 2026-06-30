import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import {Tenant} from "../../core/entities/tenant.entity";
import {TenantRatingController} from "./tenant-rating.controller";
import {TenantRatingService} from "./tenant-rating.service";

@Module({
    imports: [TypeOrmModule.forFeature([Tenant])],
    controllers: [TenantRatingController],
    providers: [TenantRatingService],
    exports: [TenantRatingService],
})
export class ShopRatingModule {}
