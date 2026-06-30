import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {ShopRequest} from "./shop-request.entity";
import {UserShopController} from "./user-shop.controller";
import {UserShopService} from "./user-shop.service";
import {Tenant} from "../../../../core/entities/tenant.entity";
import {MarketSetting} from "../../settings/market-setting.entity";
import {NotificationModule} from "../../../../shared/notification/notification.module";
import {SmsModule} from "../../../../shared/gateways/sms/sms.module";
import {QueuesModule} from "../../../../shared/queue/queues.module";
import {TenantCategory} from "../../category/tenant-category.entity";

@Module({
    imports: [TypeOrmModule.forFeature([ShopRequest,Tenant,TenantCategory,MarketSetting]),
        QueuesModule,
    NotificationModule,SmsModule],
    controllers: [UserShopController],
    providers: [UserShopService],
    exports: [UserShopService], // Export service if used in other modules
})
export class UserShopModule {}