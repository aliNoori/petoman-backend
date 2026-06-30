import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger';
import {IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min} from 'class-validator';
import {MediaTypeEnum} from "../../../film/report/create-report.dto";
import {Transform} from "class-transformer";

export enum DiscountType{
    PERCENTAGE='percentage',
    FIXED='fixed'
}

export class AttachProductDto {

    @ApiProperty({ example: 'uuid' })
    @IsOptional()
    @IsString()
    globalProductId?: string;


    @ApiProperty({ example: 250000 })
    @IsOptional()
    @IsInt()
    @Min(0)
    discountedPrice?: number;

    @ApiProperty({ example: 12 })
    @IsOptional()
    @IsInt()
    @Min(0)
    discountValue?: number;

    @ApiProperty({ example: 'percentage' })
    @IsOptional()
    @IsEnum(DiscountType)
    discountType?: DiscountType;

    @ApiProperty({ example: '1404/10/09' })
    @IsOptional()
    @IsString()
    expiryDate?: string;

    @ApiProperty({ example: '1404/10/09' })
    @IsOptional()
    @IsString()
    discountStartDate?: string;

    @ApiProperty({ example: '1404/10/09' })
    @IsOptional()
    @IsString()
    discountEndDate?: string;

    @ApiPropertyOptional({ description: 'تخفیف دارد؟', type: Boolean })
    @IsOptional()
    @IsBoolean()
    hasDiscount?: boolean;

    @ApiPropertyOptional({ description: 'توضیحات'})
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: 'تاریخ انقضا دارد؟', type: Boolean })
    @IsOptional()
    @IsBoolean()
    hasExpiryDate?: boolean;

    @ApiPropertyOptional({ description: 'تخفیف دارد؟', type: Boolean })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiProperty({ example: 250000 })
    @IsInt()
    @Min(0)
    price: number;

    @ApiProperty({ example: 10 })
    @IsInt()
    @Min(0)
    stock: number;

    @ApiProperty({
        example: ['uuid-category-1', 'uuid-category-2'],
        required: false,
    })
    @IsOptional()
    @IsArray()
    @IsUUID('all', { each: true })
    categoryIds?: string[];
}