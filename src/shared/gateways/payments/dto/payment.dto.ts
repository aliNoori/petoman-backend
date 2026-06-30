import { IsString, IsNumber, IsOptional, IsNotEmpty, Min, Max, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderPaymentDto {
    @IsString()
    @IsNotEmpty()
    orderId: string;

    @IsNumber()
    @Min(0, { message: 'مبلغ باید عددی مثبت یا صفر باشد.' })
    amount: number;

    @IsString()
    @IsNotEmpty()
    tenantId: string;

    @IsOptional()
    @IsObject()
    meta?: Record<string, any>;
}

export class PayDto {
    @IsNumber()
    @Min(0, { message: 'مبلغ باید عددی مثبت یا صفر باشد.' })
    amount: number;

    @IsOptional()
    @IsObject()
    meta?: Record<string, any>;

    @IsOptional()
    @IsObject()
    supporterInfo?: Record<string, any>;
}