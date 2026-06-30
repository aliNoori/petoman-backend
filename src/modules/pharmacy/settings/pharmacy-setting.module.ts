import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {PharmacySettingController} from "./pharmacy-setting.controller";
import {PharmacySettingService} from "./pharmacy-setting.service";
import {MarketSetting} from "../../market/settings/market-setting.entity";
import {PendingShopInfoChange} from "../../market/settings/pending-shop-info-change.entity";
import {TenantModule} from "../../../tenants/tenant.module";

@Module({
    imports: [TypeOrmModule.forFeature([MarketSetting,PendingShopInfoChange]),TenantModule],
    controllers: [PharmacySettingController],
    providers: [PharmacySettingService],
    exports: [PharmacySettingService],
})
export class PharmacySettingModule {}