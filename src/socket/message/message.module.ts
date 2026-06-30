import { Module } from '@nestjs/common';
import {TypeOrmModule} from "@nestjs/typeorm";
import {Message} from "./message.entity";
import {MessageService} from "./message.service";
import {MessageController} from "./message.controller";
import {JwtModule} from "@nestjs/jwt";
import {SessionModule} from "../../shared/user/session.module";

@Module({
    imports: [TypeOrmModule.forFeature([Message]),JwtModule,SessionModule],
    controllers:[MessageController],
    providers: [MessageService],
    exports: [MessageService],
})
export class MessageModule {}