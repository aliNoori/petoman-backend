import { ApiProperty } from "@nestjs/swagger";
import {IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min} from "class-validator";

export class CreateDiscountDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    code: string;

    @ApiProperty({ enum: ['percent', 'fixed'] })
    @IsEnum(['percent', 'fixed'])
    type: 'percent' | 'fixed';

    @ApiProperty()
    @IsInt()
    @Min(0)
    value: number;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsInt()
    @Min(0)
    minPurchase?: number;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsInt()
    @Min(0)
    maxDiscountAmount?: number;

    @ApiProperty({ required: false, type: Date })
    @IsOptional()
    expireDate?: Date;
}

export class ApplyDiscountDto {

    @ApiProperty()
    @IsOptional()
    canApply?: boolean;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    code: string;

    @ApiProperty()
    @IsNumber()
    cartTotal: number; // مبلغ کل سبد خرید بدون تخفیف
}