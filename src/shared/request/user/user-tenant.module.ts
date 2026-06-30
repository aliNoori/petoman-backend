import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {UserTenantService} from "./user-tenant.service";
import {SmsModule} from "../../gateways/sms/sms.module";
import {NotificationModule} from "../../notification/notification.module";
import {QueuesModule} from "../../queue/queues.module";
import {Tenant} from "../../../core/entities/tenant.entity";
import {TenantRequest} from "../entities/tenant-request.entity";
import {TenantSetting} from "../entities/tenant-setting.entity";
import {UserTenantController} from "./user-tenant.controller";
import {Appointment} from "../../../modules/vet&clinic/entities/appointment.entity";
import {BankCard} from "../../../modules/market/account/bank-card.entity";
import {TimeOffBlock} from "../../../modules/vet&clinic/entities/time-off.entity";
import {AppointmentQueue} from "../../../modules/vet&clinic/appointment/entities/appointment-queue.entity";
import {Order} from "../../order/order.entity";
import {OrderStateMachineService} from "../../../modules/pharmacy/payment/order-state-machine.service";
import {WalletModule} from "../../wallet/wallet.module";
import {TenantSpecialty} from "../../../core/entities/tenant-specialty.entity";
import {ClinicService} from "../../../modules/vet&clinic/entities/clinic-service.entity";


@Module({
    imports: [TypeOrmModule.forFeature([TenantRequest,Tenant,TenantSetting,ClinicService,TenantSpecialty,
        Appointment,AppointmentQueue,BankCard,TimeOffBlock,Order,TenantSpecialty]),
        QueuesModule,
    NotificationModule,SmsModule,WalletModule],
    controllers: [UserTenantController],
    providers: [UserTenantService,OrderStateMachineService],
    exports: [UserTenantService], // Export service if used in other modules
})
export class UserTenantModule {}