// src/modules/pets/pets.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PetsService } from './pets.service';
import { PetsController} from "./pets.controller";
import { Pet} from "../entities/pet.entity";
import {JwtModule} from "@nestjs/jwt";
import {SessionModule} from "../../../shared/user/session.module";

@Module({
    imports: [TypeOrmModule.forFeature([Pet]),JwtModule,SessionModule],
    controllers: [PetsController],
    providers: [PetsService],
    exports: [PetsService], // اگر ماژول‌های دیگر (مثل appointments) به سرویس Pet نیاز دارند
})
export class PetsModule {}