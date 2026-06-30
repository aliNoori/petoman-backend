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

export class CreateDanimPostDto {
    @ApiProperty({ description: 'عنوان پست', maxLength: 150 })
    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    title: string;

    @ApiPropertyOptional({ description: 'اسلاگ پست', maxLength: 100 })
    @IsString()
    @IsOptional()
    @MaxLength(100)
    slug?: string;

    @ApiProperty({ description: 'محتوای اصلی پست' })
    @IsString()
    @IsNotEmpty()
    content: string;

    @ApiPropertyOptional({ description: 'خلاصه کوتاه پست' })
    @IsOptional()
    @IsString()
    excerpt?: string;

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

    @ApiProperty({ enum: PostStatus, description: 'وضعیت پست' })
    @IsEnum(PostStatus)
    status: PostStatus;

    @ApiPropertyOptional({ description: 'نمایش در منو', type: Boolean })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    showInMenu?: boolean;

    @ApiPropertyOptional({ description: 'تصویر اصلی پست' })
    @IsOptional()
    @IsString()
    image?: string;

    @ApiPropertyOptional({ type: [String], description: 'دسته‌بندی‌ها' })
    @IsOptional()
    @IsArray()
    categories?: string[];

    @ApiPropertyOptional({ type: [String], description: 'برچسب‌ها' })
    @IsOptional()
    @IsArray()
    tags?: string[];

    @ApiPropertyOptional({ type: [String], description: 'کلمات کلیدی' })
    @IsOptional()
    @IsArray()
    keywords?: string[];   // 👈 اضافه شد

    @ApiPropertyOptional({ description: 'عنوان OG' })
    @IsOptional()
    @IsString()
    ogTitle?: string;

    @ApiPropertyOptional({ description: 'توضیحات OG' })
    @IsOptional()
    @IsString()
    ogDescription?: string;

    @ApiPropertyOptional({ description: 'تصویر OG' })
    @IsOptional()
    @IsString()
    ogImage?: string;

    @ApiPropertyOptional({ description: 'نوع Schema' })
    @IsOptional()
    @IsString()
    schemaType?: string;

    @ApiPropertyOptional({ type: String, format: 'date-time', description: 'تاریخ انتشار پست' })
    @IsOptional()
    @IsDateString()
    publishDate?: string;
}