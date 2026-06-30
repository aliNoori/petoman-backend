import { IsNotEmpty, IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWithdrawalDto {
    @ApiProperty({ example: 500000, description: 'مبلغ به تومان' })
    @IsNotEmpty()
    @IsNumber()
    @Min(10000) // حداقل مبلغ برداشت
    amount: number;

    @ApiProperty({ example: 'uuid-of-card', description: 'شناسه کارت بانکی ذخیره شده' })
    @IsNotEmpty()
    @IsString()
    cardId: string;

    @ApiProperty({ example: 'تسویه حساب هفته اول', required: false })
    @IsOptional()
    @IsString()
    note?: string;
}