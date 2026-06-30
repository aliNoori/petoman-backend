import {forwardRef, Module} from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import {TenantModule} from "../../../tenants/tenant.module";
import {MarketPaymentController} from "./market-payment.controller";
import {MarketPaymentService} from "./market-payment.service";
import {WalletModule} from "../../../shared/wallet/wallet.module";
import {OrderStateMachineService} from "./order-state-machine.service";
import {QueuesModule} from "../../../shared/queue/queues.module";
import {NotificationModule} from "../../../shared/notification/notification.module";
import {DiscountModule} from "../../../shared/discount/discount.module";


@Module({
    imports: [TypeOrmModule.forFeature([]),TenantModule,WalletModule,QueuesModule,NotificationModule,DiscountModule],
    controllers: [MarketPaymentController],
    providers: [MarketPaymentService,OrderStateMachineService],
    exports: [MarketPaymentService,OrderStateMachineService],
})
export class MarketPaymentModule {}
