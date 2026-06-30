import { IsNotEmpty, IsString, IsOptional, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBankCardDto {
    @ApiProperty({ example: '6037997400123456', description: 'شماره کارت ۱۶ رقمی (بدون خط تیره)' })
    @IsOptional()
    @IsString()
    @Length(16, 16)
    @Matches(/^\d+$/, { message: 'شماره کارت فقط باید شامل عدد باشد' })
    cardNumber?: string;

    @ApiProperty({ example: '017000000000000000000001', description: 'شماره شبا ۲۴ رقمی (بدون IR)' })
    @IsOptional()
    @IsString()
    @Length(24, 24)
    @Matches(/^\d+$/, { message: 'شماره شبا فقط باید شامل عدد باشد' })
    iban?: string;
}