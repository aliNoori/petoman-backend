import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {Medicine} from "../../../shared/medicine/medicine.entity";
import {PharmacyMedicine} from "./pharmacy-medicine.entity";
import {TenantModule} from "../../../tenants/tenant.module";
import {PharmacyMedicineController} from "./pharmacy-medicine.controller";
import {PharmacyMedicineService} from "./pharmacy-medicine.service";


@Module({
    imports: [TypeOrmModule.forFeature([Medicine, PharmacyMedicine]), TenantModule],
    controllers: [PharmacyMedicineController],
    providers: [PharmacyMedicineService],
    exports: [PharmacyMedicineService],
})
export class PharmacyMedicineModule {}