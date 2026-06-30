import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {TenantModule} from "../../../../tenants/tenant.module";
import {Tenant} from "../../../../core/entities/tenant.entity";
import {ShopRequest} from "../../user/shops/shop-request.entity";
import {AdminShopController} from "./admin-shop.controller";
import {AdminShopService} from "./admin-shop.service";
import {NotificationModule} from "../../../../shared/notification/notification.module";
import {SmsModule} from "../../../../shared/gateways/sms/sms.module";
import {QueuesModule} from "../../../../shared/queue/queues.module";
import {PendingShopInfoChange} from "../../settings/pending-shop-info-change.entity";
import {MarketSetting} from "../../settings/market-setting.entity";
import {User} from "../../../../shared/user/entities/user.entity";
import {ShopReview} from "../../review/shop-review.entity";
import {Withdrawal} from "../../request/entities/withdrawal.entity";
import {Wallet} from "../../../../shared/wallet/wallet.entity";
import {WalletModule} from "../../../../shared/wallet/wallet.module";
import {TenantAddress} from "../../../../core/entities/tenant-address.entity";

@Module({
    imports: [TypeOrmModule.forFeature([User,ShopReview,TenantAddress,ShopRequest,Tenant,PendingShopInfoChange,MarketSetting,Withdrawal,Wallet]),
        QueuesModule,TenantModule,NotificationModule,SmsModule,WalletModule],
    controllers: [AdminShopController],
    providers: [AdminShopService],
    exports: [AdminShopService], // Export service if used in other modules
})
export class AdminShopModule {}