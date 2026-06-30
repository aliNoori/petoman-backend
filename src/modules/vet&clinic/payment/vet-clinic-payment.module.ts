import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantModule } from "../../../tenants/tenant.module";
import { VetClinicPaymentController } from "./vet-clinic-payment.controller";
import { VetClinicPaymentService } from "./vet-clinic-payment.service";
import { WalletModule } from "../../../shared/wallet/wallet.module";
import { QueuesModule } from "../../../shared/queue/queues.module";
import { NotificationModule } from "../../../shared/notification/notification.module";
import { Order } from "../../../shared/order/order.entity";
import { Payment } from "../../../shared/gateways/payments/payment.entity";
import { Wallet } from "../../../shared/wallet/wallet.entity";
import { WalletTransaction } from "../../../shared/wallet/wallet-transaction.entity";
import { Transaction } from "../../../shared/transaction/transaction.entity";
import { User } from "../../../shared/user/entities/user.entity";
import { Tenant } from "../../../core/entities/tenant.entity";
import {OrderStateMachineService} from "../../market/payment/order-state-machine.service";
import {ClinicModule} from "../clinic.module";
import {AppointmentModule} from "../appointment/appointment.module";
import {AppointmentService} from "../appointment/appointment.service";

@Module({
    imports: [
        // ثبت انتیتی‌ها در TypeOrm
        TypeOrmModule.forFeature([
            Order,
            Payment,
            Wallet,
            WalletTransaction,
            Transaction,
            User,
            Tenant
        ]),
        TenantModule,
        ClinicModule,
        WalletModule,
        AppointmentModule,
        QueuesModule,
        NotificationModule,
    ],
    controllers: [VetClinicPaymentController],
    providers: [VetClinicPaymentService,OrderStateMachineService],
    exports: [VetClinicPaymentService],
})
export class VetClinicPaymentModule { }