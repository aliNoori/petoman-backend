import {
    IsString,
    IsOptional,
    IsEnum,
    IsBoolean,
    MaxLength,
    IsNotEmpty,
    IsArray,
    IsDateString,
} from 'class-validator';
import { PostStatus } from "../post.entity";
import { Transform } from "class-transformer";
import {ApiProperty, ApiPropertyOptional} from "@nestjs/swagger";

export class CreateFilmPostDto {
    @ApiProperty({ example: 'اولین پست وبلاگ', description: 'عنوان پست (حداکثر ۱۵۰ کاراکتر)' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    title: string;

    @ApiPropertyOptional({ example: 'first-post', description: 'اسلاگ پست (حداکثر ۱۰۰ کاراکتر)' })
    @IsString()
    @IsOptional()
    @MaxLength(100)
    slug?: string;

    @ApiProperty({ example: 'این متن محتوای اصلی پست است.', description: 'محتوای پست' })
    @IsString()
    @IsNotEmpty()
    content: string;

    @ApiPropertyOptional({ example: 'خلاصه‌ای کوتاه از پست', description: 'خلاصه پست' })
    @IsOptional()
    @IsString()
    excerpt?: string;

    @ApiPropertyOptional({ example: 'عنوان متا برای سئو', description: 'عنوان متا (حداکثر ۷۰ کاراکتر)' })
    @IsOptional()
    @IsString()
    @MaxLength(70)
    metaTitle?: string;

    @ApiPropertyOptional({ example: 'توضیحات متا برای سئو', description: 'توضیحات متا (حداکثر ۱۷۰ کاراکتر)' })
    @IsOptional()
    @IsString()
    @MaxLength(170)
    metaDescription?: string;

    @ApiProperty({ example: PostStatus.PUBLISHED, description: 'وضعیت پست', enum: PostStatus })
    @IsEnum(PostStatus)
    status: PostStatus;

    @ApiPropertyOptional({ example: 'https://example.com/thumbnail.jpg', description: 'تصویر بندانگشتی پست' })
    @IsOptional()
    @IsString()
    thumbnailUrl?: string;

    @ApiPropertyOptional({ example: ['category-1', 'category-2'], description: 'لیست دسته‌بندی‌های پست', type: [String] })
    @IsOptional()
    @IsArray()
    categories?: string[];

    @ApiPropertyOptional({ example: ['tag1', 'tag2'], description: 'لیست برچسب‌های پست', type: [String] })
    @IsOptional()
    @IsArray()
    tags?: string[];

    @ApiPropertyOptional({ example: '2025-12-06', description: 'تاریخ انتشار پست', type: String, format: 'date' })
    @IsOptional()
    @IsDateString()
    publishDate?: string;

    @ApiProperty({ example: 'category-123', description: 'شناسه دسته‌بندی اصلی پست' })
    @IsString()
    categoryId: string;
}