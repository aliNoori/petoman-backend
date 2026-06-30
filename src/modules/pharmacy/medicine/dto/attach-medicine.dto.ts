import {IsNotEmpty, IsNumber, IsOptional, IsBoolean, IsDateString, IsEnum, Min, IsString} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AttachMedicineDto {
    // --- شناسه داروی سراسری ---

    @ApiProperty({
        description: 'شناسه داروی سراسری (Global Medicine ID) که می‌خواهید به داروخانه اضافه کنید',
        example: 123,
    })
    @IsNotEmpty({ message: 'شناسه داروی سراسری الزامی است' })
    @IsString()
    globalMedicineId: string;

    // --- اطلاعات مالی و موجودی ---

    @ApiProperty({
        description: 'قیمت فروش دارو برای این داروخانه',
        example: 150000,
    })
    @IsNotEmpty({ message: 'قیمت الزامی است' })
    @IsNumber({}, { message: 'قیمت باید عدد باشد' })
    @Min(0, { message: 'قیمت نمی‌تواند منفی باشد' })
    price: number;

    @ApiProperty({
        description: 'موجودی اولیه دارو',
        example: 50,
        default: 0,
    })
    @IsNumber({}, { message: 'موجودی باید عدد باشد' })
    @Min(0, { message: 'موجودی نمی‌تواند منفی باشد' })
    stock: number;

    @ApiPropertyOptional({
        description: 'وضعیت فعال/غیرفعال بودن دارو در فروشگاه',
        default: true,
    })
    @IsBoolean({ message: 'وضعیت باید بولین باشد' })
    @IsOptional()
    isActive?: boolean;

    @ApiPropertyOptional({
        description: 'تاریخ انقضا',
        example: '2026-02-28',
    })
    @IsOptional()
    @IsString()
    expiryDate?: string;

    @ApiPropertyOptional({ description: 'آیا تخفیف دارد؟' })
    @IsOptional()
    @IsBoolean()
    hasDiscount?: boolean;

    @ApiPropertyOptional({ enum: ['percentage', 'fixed'], description: 'نوع تخفیف' })
    @IsOptional()
    @IsEnum(['percentage', 'fixed'])
    discountType?: 'percentage' | 'fixed';

    @ApiPropertyOptional({ description: 'مقدار تخفیف' })
    @IsOptional()
    @IsNumber()
    discountValue?: number;
}