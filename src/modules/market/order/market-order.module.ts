import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import {TenantModule} from "../../../tenants/tenant.module";
import {MarketOrderController} from "./market-order.controller";
import {MarketOrderService} from "./market-order.service";
import {ProductOrderItem} from "./product-order-item.entity";
import {WalletModule} from "../../../shared/wallet/wallet.module";
import {MarketPaymentModule} from "../payment/market-payment.module";
import {TrackingService} from "./tracing-order.service";
import {Order} from "../../../shared/order/order.entity";

@Module({
    imports: [TypeOrmModule.forFeature([ProductOrderItem,Order]),TenantModule,WalletModule,MarketPaymentModule],
    controllers: [MarketOrderController],
    providers: [MarketOrderService,TrackingService],
    exports: [MarketOrderService],
})
export class MarketOrderModule {}
