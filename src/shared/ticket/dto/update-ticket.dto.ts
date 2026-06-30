import { PartialType } from '@nestjs/mapped-types';
import { CreateTicketDto } from './create-ticket.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { TicketStatus} from "../ticket.entity";

export class UpdateTicketDto extends PartialType(CreateTicketDto) {
    @IsEnum(TicketStatus)
    @IsOptional()
    status?: TicketStatus;
}