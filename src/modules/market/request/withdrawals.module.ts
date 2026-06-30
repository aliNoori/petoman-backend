import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WithdrawalsService } from './withdrawals.service';
import { WithdrawalsController } from './withdrawals.controller';
import { Withdrawal } from './entities/withdrawal.entity';
import {Wallet} from "../../../shared/wallet/wallet.entity";
import {BankCard} from "../account/bank-card.entity";
import {TenantModule} from "../../../tenants/tenant.module";
import {WalletModule} from "../../../shared/wallet/wallet.module";

@Module({
    imports: [
        TypeOrmModule.forFeature([Withdrawal, Wallet, BankCard]),TenantModule,WalletModule
    ],
    controllers: [WithdrawalsController],
    providers: [WithdrawalsService],
    exports: [WithdrawalsService], // اگر ماژول دیگری نیاز به سرویس داشت
})
export class WithdrawalsModule {}