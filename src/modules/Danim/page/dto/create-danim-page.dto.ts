import {
    IsString,
    IsOptional,
    IsEnum,
    IsBoolean,
    MaxLength,
    IsNotEmpty,
    IsDate,
} from 'class-validator';
import { PageStatus} from "../page.entity";
import { Transform } from 'class-transformer';
import {ApiProperty, ApiPropertyOptional} from "@nestjs/swagger";

export class CreateDanimPageDto {
    // --- Basic ---
    @ApiProperty({ description: 'عنوان صفحه', maxLength: 150 })
    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    title: string;

    @ApiPropertyOptional({ description: 'اسلاگ صفحه', maxLength: 100 })
    @IsString()
    @IsOptional()
    @MaxLength(100)
    slug?: string;

    @ApiProperty({ description: 'محتوای اصلی صفحه' })
    @IsString()
    @IsNotEmpty()
    content: string;

    @ApiPropertyOptional({ description: 'خلاصه کوتاه صفحه' })
    @IsOptional()
    @IsString()
    excerpt?: string;

    // --- Status ---
    @ApiProperty({ enum: PageStatus, description: 'وضعیت صفحه' })
    @IsEnum(PageStatus)
    status: PageStatus;

    // --- Template ---
    @ApiPropertyOptional({ description: 'نام قالب صفحه' })
    @IsOptional()
    @IsString()
    template?: string;

    // --- Publish Date ---
    @ApiPropertyOptional({ type: String, format: 'date-time', description: 'تاریخ انتشار صفحه' })
    @IsOptional()
    @Transform(({ value }) => (value ? new Date(value) : null))
    @IsDate()
    publishDate?: Date;

    // --- SEO ---
    @ApiPropertyOptional({ description: 'عنوان متا', maxLength: 70 })
    @IsOptional()
    @IsString()
    @MaxLength(70)
    metaTitle?: string;

    @ApiPropertyOptional({ description: 'توضیحات متا', maxLength: 170 })
    @IsOptional()
    @IsString()
    @MaxLength(170)
    metaDescription?: string;

    // --- OpenGraph ---
    @ApiPropertyOptional({ description: 'عنوان OG', maxLength: 100 })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    ogTitle?: string;

    @ApiPropertyOptional({ description: 'توضیحات OG', maxLength: 200 })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    ogDescription?: string;

    @ApiPropertyOptional({ description: 'تصویر OG' })
    @IsOptional()
    @IsString()
    ogImage?: string;

    // --- Main Image ---
    @ApiPropertyOptional({ description: 'تصویر اصلی صفحه' })
    @IsOptional()
    @IsString()
    image?: string;

    // --- Menu (if needed) ---
    @ApiPropertyOptional({ description: 'نمایش در منو', type: Boolean })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    showInMenu?: boolean;
}