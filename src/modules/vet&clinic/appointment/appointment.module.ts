import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {AppointmentService} from "./appointment.service";
import {AppointmentController} from "./appointment.controller";
import {Appointment} from "../entities/appointment.entity";
import {AppointmentQueue} from "./entities/appointment-queue.entity";
import {QueuesModule} from "../../../shared/queue/queues.module";
import {JwtModule} from "@nestjs/jwt";
import {SessionModule} from "../../../shared/user/session.module";

@Module({
    imports: [TypeOrmModule.forFeature([Appointment,AppointmentQueue]),QueuesModule,JwtModule,SessionModule],
    controllers: [AppointmentController],
    providers: [AppointmentService],
    exports: [AppointmentService],
})
export class AppointmentModule {}