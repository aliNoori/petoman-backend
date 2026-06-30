import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import {TenantModule} from "../../../tenants/tenant.module";
import {WalletModule} from "../../../shared/wallet/wallet.module";
import {TrackingService} from "./tracing-order.service";
import {Order} from "../../../shared/order/order.entity";
import {PharmacyOrderController} from "./pharmacy-order.controller";
import {PharmacyOrderService} from "./pharmacy-order.service";
import {ProductOrderItem} from "../../market/order/product-order-item.entity";
import {PharmacyPaymentModule} from "../payment/pharmacy-payment.module";

@Module({
    imports: [TypeOrmModule.forFeature([ProductOrderItem,Order]),TenantModule,WalletModule,PharmacyPaymentModule],
    controllers: [PharmacyOrderController],
    providers: [PharmacyOrderService,TrackingService],
    exports: [PharmacyOrderService],
})
export class PharmacyOrderModule {}
