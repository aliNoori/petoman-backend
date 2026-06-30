import { Module} from '@nestjs/common'
import { PaymentService } from './payment.service'
import { PaymentController } from './payment.controller'
import { ZarinpalGateway } from './gateways/zarinpal.gateway'
import {TypeOrmModule} from "@nestjs/typeorm";
import {Order} from "../../order/order.entity";
import {Transaction} from "../../transaction/transaction.entity";
import {Supporter} from "../../../modules/supporter/public-supporters/supporter.entity";
import {KindnessMeeting} from "../../../modules/supporter/kindness-meeting/kindness-meeting.entity";
import {User} from "../../user/entities/user.entity";
import {Donation} from "../../../modules/supporter/donation/donation.entity";
import {Wallet} from "../../wallet/wallet.entity";
import {WalletTransaction} from "../../wallet/wallet-transaction.entity";
import {WalletModule} from "../../wallet/wallet.module";
import {MarketPaymentModule} from "../../../modules/market/payment/market-payment.module";
import {VetClinicPaymentModule} from "../../../modules/vet&clinic/payment/vet-clinic-payment.module";
import {Appointment} from "../../../modules/vet&clinic/entities/appointment.entity";
import {PharmacyPaymentModule} from "../../../modules/pharmacy/payment/pharmacy-payment.module";
import {QueuesModule} from "../../queue/queues.module";
import {PaymentReconciliationService} from "./payment-reconciliation.service";
import {Payment} from "./payment.entity";
import {JwtModule} from "@nestjs/jwt";
import {SessionModule} from "../../user/session.module";


@Module({
    imports: [
        TypeOrmModule.forFeature([Order,Transaction,Payment,Supporter,KindnessMeeting,User,Donation,Wallet,WalletTransaction,Appointment]), // ← این خط مهمه
    WalletModule,MarketPaymentModule,VetClinicPaymentModule,PharmacyPaymentModule,QueuesModule,JwtModule,SessionModule],
    controllers: [PaymentController],
    providers: [PaymentService, ZarinpalGateway,PaymentReconciliationService],
    exports: [PaymentService,PaymentReconciliationService],
})
export class PaymentModule {}