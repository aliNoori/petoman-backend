import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum, IsArray, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePharmacyMedicineDto {
    @ApiPropertyOptional({ description: 'شناسه دارو در سیستم جهانی. اگر ارسال شود، داروی جدید ساخته نمی‌شود.' })
    @IsOptional()
    @IsString()
    medicineId?: string;

    // فیلدهای مربوط به ایجاد داروی جدید (فوق‌العاده)
    @ApiPropertyOptional({ description: 'نام دارو' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ description: 'نوع: دارو' })
    @IsString()
    type: string;

    @ApiPropertyOptional({ description: 'کد یکتای دارو' })
    @IsOptional()
    @IsString()
    code?: string;

    @ApiPropertyOptional({ description: 'دسته‌بندی' })
    @IsOptional()
    @IsString()
    category?: string;

    @ApiProperty({ example: 'واکسن > انتی بیوتیک' })
    @IsString()
    categoryBreadcrumb: string

    @ApiPropertyOptional({ description: 'ماده موثره' })
    @IsOptional()
    @IsString()
    activeIngredient?: string;

    @ApiPropertyOptional({ description: 'شکل دارویی' })
    @IsOptional()
    @IsString()
    dosageForm?: string;

    @ApiPropertyOptional({ description: 'دوز مصرفی' })
    @IsOptional()
    @IsString()
    dosage?: string;

    @ApiPropertyOptional({ description: 'مناسب برای' })
    @IsOptional()
    @IsString()
    suitableFor?: string;

    @ApiPropertyOptional({ description: 'شرایط نگهداری' })
    @IsOptional()
    @IsString()
    storage?: string;

    @ApiPropertyOptional({ description: 'نیاز به نسخه' })
    @IsOptional()
    @IsBoolean()
    prescriptionRequired?: boolean;

    @ApiPropertyOptional({ type: [String], description: 'تصاویر گالری' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    galleryImages?: string[];

    @ApiPropertyOptional({ description: 'تصویر اصلی' })
    @IsOptional()
    @IsString()
    image?: string;

    // فیلدهای مالی و انبارداری (الزامی برای PharmacyMedicine)
    @ApiProperty({ description: 'قیمت' })
    @IsNumber()
    price: number;

    @ApiProperty({ description: 'موجودی' })
    @IsNumber()
    stock: number;

    @ApiPropertyOptional({ description: 'تاریخ انقضا' })
    @IsOptional()
    @IsString()
    expiryDate?: string;

    @ApiPropertyOptional({ description: 'وضعیت فعال بودن در داروخانه' })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

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