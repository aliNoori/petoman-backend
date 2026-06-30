import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketSettingService } from './market-setting.service';
import { MarketSettingController } from './market-setting.controller';
import { MarketSetting} from "./market-setting.entity";
import {TenantModule} from "../../../tenants/tenant.module";
import {PendingShopInfoChange} from "./pending-shop-info-change.entity";

@Module({
    imports: [TypeOrmModule.forFeature([MarketSetting,PendingShopInfoChange]),TenantModule],
    controllers: [MarketSettingController],
    providers: [MarketSettingService],
    exports: [MarketSettingService],
})
export class MarketSettingModule {}