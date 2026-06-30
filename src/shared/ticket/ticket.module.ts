import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketsService} from "./ticket.service";
import { TicketsController} from "./ticket.controller";
import { Ticket} from "./ticket.entity";
import {TicketMessage} from "./ticket-messages.entity";
import {JwtModule} from "@nestjs/jwt";
import {SessionModule} from "../user/session.module";

@Module({
    imports: [
        TypeOrmModule.forFeature([Ticket,TicketMessage]),JwtModule,SessionModule],
    controllers: [TicketsController],
    providers: [TicketsService],
    exports: [TicketsService],
})
export class TicketsModule {}