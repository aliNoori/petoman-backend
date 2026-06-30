import {forwardRef, Module} from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import {TenantModule} from "../../../tenants/tenant.module";
import {WalletModule} from "../../../shared/wallet/wallet.module";
import {QueuesModule} from "../../../shared/queue/queues.module";
import {NotificationModule} from "../../../shared/notification/notification.module";
import {PharmacyPaymentController} from "./pharmacy-payment.controller";
import {PharmacyPaymentService} from "./pharmacy-payment.service";
import {OrderStateMachineService} from "./order-state-machine.service";
import {Transaction} from "../../../shared/transaction/transaction.entity";
import {Order} from "../../../shared/order/order.entity";
import {Payment} from "../../../shared/gateways/payments/payment.entity";
import {User} from "../../../shared/user/entities/user.entity";
import {Tenant} from "../../../core/entities/tenant.entity";


@Module({
    imports: [TypeOrmModule.forFeature([Transaction,Order,Payment,User,Tenant]),TenantModule,WalletModule,QueuesModule,NotificationModule],
    controllers: [PharmacyPaymentController],
    providers: [PharmacyPaymentService,OrderStateMachineService],
    exports: [PharmacyPaymentService,OrderStateMachineService],
})
export class PharmacyPaymentModule {}
