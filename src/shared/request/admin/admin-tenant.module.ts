import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {WalletModule} from "../../wallet/wallet.module";
import {SmsModule} from "../../gateways/sms/sms.module";
import {NotificationModule} from "../../notification/notification.module";
import {TenantModule} from "../../../tenants/tenant.module";
import {QueuesModule} from "../../queue/queues.module";
import {User} from "../../user/entities/user.entity";
import {TenantRequest} from "../entities/tenant-request.entity";
import {Tenant} from "../../../core/entities/tenant.entity";
import {TenantSetting} from "../entities/tenant-setting.entity";
import {Withdrawal} from "../../../modules/market/request/entities/withdrawal.entity";
import {Wallet} from "../../wallet/wallet.entity";
import {AdminTenantController} from "./admin-tenant.controller";
import {AdminTenantService} from "./admin-tenant.service";
import {TenantSettingChangeRequest} from "../entities/tenant-setting-change-request.entity";
import {VetClinicServiceEntity} from "../../../modules/vet&clinic/entities/service.entity";
import {Order} from "../../order/order.entity";
import {PharmacyMedicine} from "../../../modules/pharmacy/medicine/pharmacy-medicine.entity";
import {Medicine} from "../../medicine/medicine.entity";
import {TenantSpecialty} from "../../../core/entities/tenant-specialty.entity";
import {TenantAddress} from "../../../core/entities/tenant-address.entity";
import {TenantCategory} from "../../../modules/market/category/tenant-category.entity";


@Module({
    imports: [TypeOrmModule.forFeature([User,Order,TenantRequest,TenantCategory,Tenant,TenantAddress,TenantSpecialty,TenantSetting,TenantSettingChangeRequest,VetClinicServiceEntity,Withdrawal,Wallet,
    PharmacyMedicine,Medicine]),
        QueuesModule,TenantModule,NotificationModule,SmsModule,WalletModule],
    controllers: [AdminTenantController],
    providers: [AdminTenantService],
    exports: [AdminTenantService], // Export service if used in other modules
})
export class AdminTenantModule {}