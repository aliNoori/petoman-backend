import {
    ApiProperty,
    ApiPropertyOptional
} from '@nestjs/swagger';
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    IsUUID,
    Min,
    ValidateNested,
    IsDateString
} from 'class-validator';
import { Type } from 'class-transformer';

export enum DiscountType {
    PERCENTAGE = 'percentage',
    FIXED = 'fixed'
}

// کلاس کمکی برای مشخصات فنی
export class ProductSpecificationDto {
    @ApiProperty({ example: 'وزن' })
    @IsString( { message: 'عنوان مشخصه فنی باید از نوع متن باشد.' })
    label: string;

    @ApiProperty({ example: '200 گرم' })
    @IsString( { message: 'مقدار مشخصه فنی باید از نوع متن باشد.' })
    value: string;
}

export class CreateProductDto {

    @ApiProperty({ example: 'uuid', required: false })
    @IsOptional()
    @IsString( { message: 'شناسه محصول جهانی باید از نوع متن باشد.' })
    globalProductId?: string;

    @ApiProperty({ example: 'Royal King', required: false })
    @IsOptional()
    @IsString( { message: 'نام برند باید از نوع متن باشد.' })
    brand?: string;

    @ApiProperty({ example: 'پت شاپ > غذا > غذای سگ > غذای خشک' })
    @IsString( { message: 'مسیر دسته‌بندی الزامی و باید از نوع متن باشد.' })
    categoryBreadcrumb: string;

    @ApiProperty({ example: '4ac8eb81-41d6-42cb-b4dd-fee921da6f8b' })
    @IsString( { message: 'شناسه دسته‌بندی باید از نوع UUID معتبر باشد.' })
    @IsUUID('4', { message: 'شناسه دسته‌بندی (categoryId) نامعتبر است.' })
    categoryId: string;

    @ApiProperty({ example: 'FD-D-RC-748480' })
    @IsString( { message: 'کد محصول الزامی و باید از نوع متن باشد.' })
    code: string;

    @ApiProperty({ example: 'shop' })
    @IsString( { message: 'نوع محصول الزامی و باید از نوع متن باشد.' })
    type: string;

    @ApiProperty({ example: 'High quality dog food', required: false })
    @IsOptional()
    @IsString( { message: 'توضیحات محصول باید از نوع متن باشد.' })
    description?: string;

    @ApiProperty({ example: 250000 })
    @IsInt( { message: 'قیمت تخفیف‌خورده باید یک عدد صحیح باشد.' })
    @Min(0, { message: 'قیمت تخفیف‌خورده نمی‌تواند منفی باشد.' })
    discountedPrice: number;

    @ApiProperty({ example: 12 })
    @IsInt( { message: 'مقدار تخفیف باید یک عدد صحیح باشد.' })
    @Min(0, { message: 'مقدار تخفیف نمی‌تواند منفی باشد.' })
    discountValue: number;

    @ApiProperty({ example: 'percentage' })
    @IsEnum(DiscountType, { message: 'نوع تخفیف باید "percentage" یا "fixed" باشد.' })
    discountType: DiscountType;

    // *** تغییرات اصلی برای تاریخ انقضا ***
    @ApiProperty({ example: '1404/10/09', required: false })
    @IsOptional()
    // اگر فرمت دقیقاً YYYY/MM/DD مد نظر است، بهتر است از Regex استفاده کنید، اما برای سادگی از IsString با پیام فارسی استفاده می‌کنیم
    // نکته: بک‌اند معمولا تاریخ میلادی (ISO) می‌خواهد. اگر تاریخ را قبل از رسیدن به DTO تبدیل می‌کنید، این فیلد را حذف کنید.
    // اگر تاریخ را اینجا دریافت می‌کنید، اعتبارسنجی فرمت شمسی را اینجا انجام دهید:
    @IsString( { message: 'تاریخ انقضا باید از نوع متن باشد.' })
    // Regex برای فرمت شمسی: سال ۴ رقم، ماه ۲ رقم، روز ۲ رقم با اسلش
    @IsString({})
    expiryDate?: string;

    @ApiProperty({ example: '1404/10/09', required: false })
    @IsOptional()
    @IsString( { message: 'تاریخ شروع تخفیف الزامی است.' })
    discountStartDate?: string;

    @ApiProperty({ example: '1404/10/09', required: false })
    @IsOptional()
    @IsString( { message: 'تاریخ پایان تخفیف الزامی است.' })
    discountEndDate?: string;

    @ApiProperty({ example: ['url_01','url_02'], required: false })
    @IsOptional()
    @IsArray( { message: 'تصاویر گالری باید یک آرایه از آدرس‌ها باشند.' })
    galleryImages?: string[];

    @ApiProperty({ example: 'url', required: false })
    @IsOptional()
    @IsString( { message: 'آدرس تصویر اصلی باید از نوع متن باشد.' })
    image?: string;

    @ApiPropertyOptional({ description: 'تخفیف دارد؟', type: Boolean })
    @IsOptional()
    @IsBoolean( { message: 'فیلد hasDiscount باید بولین باشد.' })
    hasDiscount?: boolean;

    @ApiPropertyOptional({ description: 'تاریخ انقضا دارد؟', type: Boolean })
    @IsOptional()
    @IsBoolean( { message: 'فیلد hasExpiryDate باید بولین باشد.' })
    hasExpiryDate?: boolean;

    @ApiPropertyOptional({ description: 'فعال بودن محصول', type: Boolean })
    @IsOptional()
    @IsBoolean( { message: 'فیلد isActive باید بولین باشد.' })
    isActive?: boolean;

    @ApiProperty({ example: 'غذای خشک سگ 1 کیلوگرم برند رویال کنین طعم گوشت گاو جوان نژاد کوچک کیسه کم کالری' })
    @IsString( { message: 'نام محصول الزامی و باید از نوع متن باشد.' })
    name: string;

    @ApiProperty({ example: 250000 })
    @IsInt( { message: 'قیمت محصول باید یک عدد صحیح باشد.' })
    @Min(0, { message: 'قیمت محصول نمی‌تواند منفی باشد.' })
    price: number;

    @ApiProperty({ example: 10 })
    @IsInt( { message: 'موجودی باید یک عدد صحیح باشد.' })
    @Min(0, { message: 'موجودی نمی‌تواند منفی باشد.' })
    stock: number;

    @ApiProperty({
        example: ['uuid-category-1', 'uuid-category-2'],
        required: false,
    })
    @IsOptional()
    @IsArray( { message: 'شناسه‌های دسته‌بندی باید یک آرایه باشند.' })
    @IsUUID('4', { each: true, message: 'شناسه‌های دسته‌بندی (categoryIds) باید UUID معتبر باشند.' })
    categoryIds?: string[];

    // --- فیلدهای جدید ---
    @ApiProperty({ example: ['ارسال رایگان', 'تحویل فوری'], required: false })
    @IsOptional()
    @IsArray( { message: 'ویژگی‌ها باید یک آرایه از متن باشند.' })
    @IsString({each:true, message: 'هر یک از ویژگی‌ها باید از نوع متن باشد.' })
    features?: string[];

    @ApiProperty({
        example: [{ label: 'وزن', value: '200 گرم' }, { label: 'جنس', value: 'پنبه' }],
        required: false,
        type: [ProductSpecificationDto]
    })
    @IsOptional()
    @IsArray( { message: 'مشخصات فنی باید یک آرایه باشند.' })
    @ValidateNested({ each: true })
    @Type(() => ProductSpecificationDto)
    specifications?: ProductSpecificationDto[];
}