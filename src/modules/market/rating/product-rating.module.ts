import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import {TenantModule} from "../../../tenants/tenant.module";
import {ProductRatingController} from "./product-rating.controller";
import {ProductRatingService} from "./product-rating.service";

@Module({
    imports: [TypeOrmModule.forFeature([]),TenantModule],
    controllers: [ProductRatingController],
    providers: [ProductRatingService],
    exports: [ProductRatingService],
})
export class ProductRatingModule {}
