import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SmsService } from './sms.service';
import {OtpService} from "./otp.service";
import {IPPanelService} from "./ip-panel.service";
import {TypeOrmModule} from "@nestjs/typeorm";
import {OtpCode} from "./entities/otp-code.entity";
import {User} from "../../user/entities/user.entity";
import {JwtModule} from "@nestjs/jwt";
import {SessionModule} from "../../user/session.module";

@Module({
    imports: [TypeOrmModule.forFeature([OtpCode,User]),HttpModule,SessionModule
    ,JwtModule.register({
            secret: process.env.JWT_SECRET || 'my-secret-key',
            signOptions: { expiresIn: '7d' },
        })],
    providers: [SmsService,OtpService,IPPanelService],
    exports: [SmsService,OtpService,IPPanelService],
})
export class SmsModule {}
