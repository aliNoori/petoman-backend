import {
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsNumber,
    Min,
    IsDateString,
} from 'class-validator';
import { DonationStatus, DonationMethod } from '../donation.entity';
import {ApiProperty, ApiPropertyOptional} from "@nestjs/swagger";

export class CreateDonationDto {
    @ApiProperty({ example: 'supporter-123', description: 'شناسه حامی' })
    @IsString()
    @IsNotEmpty()
    supporterId: string;

    @ApiProperty({ example: 'project-456', description: 'شناسه پروژه' })
    @IsString()
    @IsNotEmpty()
    projectId: string;

    @ApiProperty({ example: 50000, description: 'مبلغ کمک (حداقل ۱۰۰۰)' })
    @IsNumber()
    @Min(1000)
    amount: number;

    @ApiProperty({ example: DonationMethod.CASH, description: 'روش کمک مالی', enum: DonationMethod })
    @IsEnum(DonationMethod)
    method: DonationMethod;

    @ApiPropertyOptional({ example: 'TRX123456', description: 'کد رهگیری تراکنش' })
    @IsOptional()
    @IsString()
    trackingCode?: string;

    @ApiPropertyOptional({ example: '2025-12-05T09:16:00Z', description: 'زمان تراکنش', type: String, format: 'date-time' })
    @IsOptional()
    @IsString()
    transactionTime?: string;

    @ApiPropertyOptional({ example: 'CHK7890', description: 'شماره چک' })
    @IsOptional()
    @IsString()
    checkNumber?: string;

    @ApiProperty({ example: '2025-12-05', description: 'تاریخ کمک مالی', type: String, format: 'date' })
    @IsDateString()
    date: string;

    @ApiProperty({ example: '14:30', description: 'ساعت کمک مالی (HH:mm)' })
    @IsString()
    time: string;

    @ApiProperty({ example: DonationStatus.COMPLETED, description: 'وضعیت کمک مالی', enum: DonationStatus })
    @IsEnum(DonationStatus)
    status: DonationStatus;

    @ApiPropertyOptional({ example: 'این کمک برای پروژه مدرسه است', description: 'یادداشت‌های اضافی' })
    @IsOptional()
    @IsString()
    note?: string;
}