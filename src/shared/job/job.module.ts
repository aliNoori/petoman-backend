import { Module } from '@nestjs/common';
import {TypeOrmModule} from "@nestjs/typeorm";
import {QueuesModule} from "../queue/queues.module";
import {NotificationModule} from "../notification/notification.module";
import {SmsModule} from "../gateways/sms/sms.module";
import {SendSmsProcessor} from "./send-sms.processor";
import {WalletSettlementProcessor} from "./wallet-settlement.processor";
import { ScheduleModule } from '@nestjs/schedule';
import {WalletSettlementScheduler} from "./schedule/wallet-settlement.scheduler";
import {WalletTransaction} from "../wallet/wallet-transaction.entity";
import {Wallet} from "../wallet/wallet.entity";
import {NotificationProcessor} from "./notification.processor";
import {CleanupProcessor} from "./cleanup.processor";
import {PaymentReconciliationProcessor} from "./payment-reconciliation.processor";
import {PaymentModule} from "../gateways/payments/payment.module";
import {PaymentReconciliationScheduler} from "./schedule/payment-reconciliation.scheduler";

@Module({
    imports: [TypeOrmModule.forFeature([Wallet,WalletTransaction]),ScheduleModule.forRoot(),
        QueuesModule,
        NotificationModule,SmsModule,PaymentModule],
    controllers: [],
    providers: [SendSmsProcessor,WalletSettlementProcessor,WalletSettlementScheduler,PaymentReconciliationScheduler,
        NotificationProcessor,CleanupProcessor,PaymentReconciliationProcessor],
    exports: [], // Export service if used in other modules
})
export class JobModule {}