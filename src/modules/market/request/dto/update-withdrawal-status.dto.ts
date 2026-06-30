import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { WithdrawalStatus } from '../entities/withdrawal.entity';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateWithdrawalStatusDto {
    @ApiProperty({ enum: WithdrawalStatus })
    @IsEnum(WithdrawalStatus)
    @IsNotEmpty()
    status: WithdrawalStatus;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    rejectionReason?: string;

    @IsOptional() // یا @IsString() اگر الزامی است
    trackId?: string;

    @IsOptional()
    paidAt?: string;
}