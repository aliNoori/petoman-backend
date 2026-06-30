import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivitiesLogService } from './activities-log.service';
import { ActivitiesLogController} from "./activities-log.controller";
import { ActivityLog} from "./activity-log.entity";
import {JwtModule} from "@nestjs/jwt";
import {SessionModule} from "../user/session.module";

@Module({
    imports: [TypeOrmModule.forFeature([ActivityLog]),JwtModule,SessionModule],
    controllers: [ActivitiesLogController],
    providers: [ActivitiesLogService],
    exports: [ActivitiesLogService], // این خط مهم است تا بتوانیم در سایر ماژول‌ها از آن استفاده کنیم
})
export class ActivitiesLogModule {}