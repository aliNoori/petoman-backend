import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import {Wallet} from "./wallet.entity";
import {WalletController} from "./wallet.controller";
import {WalletService} from "./wallet.service";
import {WalletTransaction} from "./wallet-transaction.entity";
import {TenantModule} from "../../tenants/tenant.module";
import {Payment} from "../gateways/payments/payment.entity";

@Module({
    imports: [TypeOrmModule.forFeature([Wallet,WalletTransaction,Payment]),TenantModule],
    controllers: [WalletController],
    providers: [WalletService],
    exports: [WalletService],
})
export class WalletModule {}
