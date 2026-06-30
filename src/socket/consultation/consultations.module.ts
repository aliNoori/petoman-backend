// src/consultations/consultations.module.ts
import { Module } from '@nestjs/common';
import { ConsultationsService } from './consultations.service';
import { ConsultationsController } from './consultations.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Consultation} from "./consultation.entity";
import {TenantModule} from "../../tenants/tenant.module";
import {JwtModule} from "@nestjs/jwt";
import {SessionModule} from "../../shared/user/session.module";

@Module({
    imports: [TypeOrmModule.forFeature([Consultation]),JwtModule,SessionModule],
    controllers: [ConsultationsController],
    providers: [ConsultationsService],
    exports: [ConsultationsService], // اگر ماژول‌های دیگر (مثل Messages) نیاز به این سرویس دارند
})
export class ConsultationsModule {}