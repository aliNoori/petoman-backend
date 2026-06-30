// dto/join-queue.dto.ts
import {ApiProperty, ApiPropertyOptional} from "@nestjs/swagger";
import {AppointmentType} from "../entities/appointment.entity";
import {IsEnum, IsOptional, IsString} from "class-validator";

export class JoinQueueDto {
    @ApiProperty({ enum: AppointmentType })
    @IsEnum(AppointmentType)
    serviceType: AppointmentType;

    @ApiPropertyOptional({ description: 'شناسه سفارش پرداخت شده' })
    @IsString()
    @IsOptional()
    orderId: string;
}