import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {Order} from "../../../../shared/order/order.entity";
import {ProductOrderItem} from "../../order/product-order-item.entity";
import {UserOrderController} from "./user-order.controller";
import {UserOrderService} from "./user-order.service";
import {WalletModule} from "../../../../shared/wallet/wallet.module";
import {MarketPaymentModule} from "../../payment/market-payment.module";
import {MarketProduct} from "../../product/entities/product.entity";
import {JwtModule} from "@nestjs/jwt";
import {SessionModule} from "../../../../shared/user/session.module";


@Module({
    imports: [
        TypeOrmModule.forFeature([Order,ProductOrderItem,MarketProduct]),
        WalletModule,MarketPaymentModule,JwtModule,SessionModule
    ],
    controllers: [UserOrderController],
    providers: [UserOrderService],
    exports: [UserOrderService],
})
export class UserOrderModule {}