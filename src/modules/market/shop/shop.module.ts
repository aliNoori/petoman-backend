import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {Tenant} from "../../../core/entities/tenant.entity";
import {TenantModule} from "../../../tenants/tenant.module";
import {ShopController} from "./shop.controller";
import {ShopService} from "./shop.service";


@Module({
    imports: [TypeOrmModule.forFeature([Tenant]),TenantModule],
    controllers: [ShopController],
    providers: [ShopService],
    exports: [ShopService], // Export service if used in other modules
})
export class ShopModule {}