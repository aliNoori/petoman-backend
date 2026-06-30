import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {IsInt, Min, Max, IsOptional, IsString, IsArray, ArrayNotEmpty, IsBoolean} from 'class-validator';

export class CreateReviewDto {
    @ApiProperty({ minimum: 1, maximum: 5, description: 'امتیاز کاربر از ۱ تا ۵' })
    @IsInt()
    @Min(1)
    @Max(5)
    rating: number;

    @ApiPropertyOptional({ description: 'متن نظر کاربر' })
    @IsOptional()
    @IsString()
    comment?: string;

    @ApiPropertyOptional({ description: 'عنوان نظر', type: String })
    @IsOptional()
    @IsString()
    title?: string;

    @ApiPropertyOptional({ description: 'نقاط قوت محصول', type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    pros?: string[];

    @ApiPropertyOptional({ description: 'نقاط ضعف محصول', type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    cons?: string[];

    @ApiPropertyOptional({ description: 'پیشنهاد به دیگران'})
    @IsOptional()
    @IsBoolean()
    recommended: boolean;

    @ApiPropertyOptional({ description: 'ای دی سفارض', type: String })
    @IsOptional()
    @IsString()
    orderId?: string;

    @ApiPropertyOptional({ description: 'ای دی محصول', type: String })
    @IsOptional()
    @IsString()
    productId?: string;

    @ApiPropertyOptional({ description: 'ای دی ورینت', type: String })
    @IsOptional()
    @IsString()
    variantId?: string;

    @ApiPropertyOptional({ description: 'ای دی ویزیت', type: String })
    @IsOptional()
    @IsString()
    visitId?: string;
}