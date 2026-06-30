import {forwardRef, Module} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant} from "../../core/entities/tenant.entity";
import { User} from "../../shared/user/entities/user.entity";
import {VetClinicService} from "./clinic.service";
import {Appointment} from "./entities/appointment.entity";
import {Pet} from "./entities/pet.entity";
import {VetClinicController} from "./clinic.controller";
import {TenantModule} from "../../tenants/tenant.module";
import {TenantSetting} from "../../shared/request/entities/tenant-setting.entity";
import {TenantSettingChangeRequest} from "../../shared/request/entities/tenant-setting-change-request.entity";
import {VetClinicServiceEntity} from "./entities/service.entity";
import {PetsModule} from "./pet/pets.module";
import {Consultation} from "../../socket/consultation/consultation.entity";
import {TenantReview} from "../../shared/reviews/tenant-review.entity";
import {TimeOffBlock} from "./entities/time-off.entity";
import {ClinicCapacityService} from "./clinic-capacity.service";
import {QueuesModule} from "../../shared/queue/queues.module";
import {AppointmentQueue} from "./appointment/entities/appointment-queue.entity";
import {AppointmentModule} from "./appointment/appointment.module";
import {EventEmitterModule} from "@nestjs/event-emitter";
import {Order} from "../../shared/order/order.entity";
import {Wallet} from "../../shared/wallet/wallet.entity";
import {Payment} from "../../shared/gateways/payments/payment.entity";
import {WalletModule} from "../../shared/wallet/wallet.module";
import {Medicine} from "../../shared/medicine/medicine.entity";
import {TenantSpecialty} from "../../core/entities/tenant-specialty.entity";
import {NotificationModule} from "../../shared/notification/notification.module";

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Tenant,
            TenantReview,
            TimeOffBlock,
            TenantSetting,TenantSettingChangeRequest,VetClinicServiceEntity,
            Appointment,
            Consultation,
            AppointmentQueue,
            User,
            Pet,
            Order,
            Wallet,
            Payment,
            Medicine,
            TenantSpecialty

        ]),TenantModule,WalletModule,PetsModule,QueuesModule,AppointmentModule,EventEmitterModule.forRoot(),forwardRef(() => NotificationModule)
        // AuthModule, // در صورت نیاز به گارد احراز هویت
    ],
    controllers: [VetClinicController],
    providers: [VetClinicService,ClinicCapacityService],
    exports: [VetClinicService,ClinicCapacityService],
})
export class ClinicModule {}