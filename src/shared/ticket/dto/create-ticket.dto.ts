import { IsString, IsNotEmpty, IsEnum, IsOptional, IsArray, MaxLength } from 'class-validator';
import { TicketPriority } from "../ticket.entity";
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTicketDto {
    @ApiProperty({ description: 'شناسه مستأجر (Tenant)' })
    @IsString()
    @IsNotEmpty()
    tenantId: string;

    @ApiProperty({ description: 'دپارتمان یا دسته‌بندی تیکت', example: 'financial' })
    @IsString()
    @IsNotEmpty()
    department: string;

    @ApiProperty({ enum: TicketPriority, description: 'اولویت تیکت' })
    @IsEnum(TicketPriority)
    @IsNotEmpty()
    priority: TicketPriority;

    @ApiProperty({ description: 'موضوع تیکت', maxLength: 100 })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    subject: string;

    @ApiProperty({ description: 'متن اولیه پیام' })
    @IsString()
    @IsNotEmpty()
    message: string;

    @ApiPropertyOptional({
        type: [String],
        description: 'لینک فایل‌های پیوست (آپلود شده)'
    })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    attachments?: string[];
}