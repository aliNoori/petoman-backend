// src/modules/category/dto/create-category.dto.ts
import { IsOptional, IsString, IsUUID, IsBoolean, IsInt } from 'class-validator';
import {ContentType} from "../category.entity";
import {ApiProperty, ApiPropertyOptional} from "@nestjs/swagger";
import {Transform} from "class-transformer";

export class CreateCategoryDto {
    @ApiProperty({ example: 'اخبار', description: 'عنوان دسته‌بندی' })
    @IsString()
    title: string;

    @ApiPropertyOptional({ example: 'دسته‌بندی مربوط به اخبار روز', description: 'توضیحات دسته‌بندی' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ example: '#FF5733', description: 'رنگ مرتبط با دسته‌بندی' })
    @IsOptional()
    @IsString()
    color?: string;

    @ApiPropertyOptional({ example: 'akhbar', description: 'اسلاگ دسته‌بندی' })
    @IsOptional()
    @IsString()
    slug?: string;

    @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'شناسه والد (UUID)' })
    @Transform(({ value }) => value === '' ? null : value)
    @IsOptional()
    @IsUUID()
    parentId?: string | null;

    @ApiPropertyOptional({ example: '660e8400-e29b-41d4-a716-446655440000', description: 'شناسه نوع (UUID)' })
    @IsOptional()
    @IsUUID()
    typeId?: string | null;

    @ApiPropertyOptional({ example: true, description: 'آیا دسته‌بندی فعال است؟' })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({ example: 1, description: 'ترتیب نمایش دسته‌بندی' })
    @IsOptional()
    @IsInt()
    sortOrder?: number;

    @ApiPropertyOptional({ example: 'https://example.com/icon.png', description: 'ایکون دسته‌بندی' })
    @IsOptional()
    @IsString()
    icon?: string;

    @ApiPropertyOptional({ example: 'https://example.com/logo.png', description: 'لوگوی دسته‌بندی' })
    @IsOptional()
    @IsString()
    logo?: string;

    @ApiPropertyOptional({ example: 'https://example.com/cover.png', description: 'تصویر کاور دسته‌بندی' })
    @IsOptional()
    @IsString()
    cover?: string;

    @ApiPropertyOptional({ example: ContentType.FILM, description: 'نوع محتوا', enum: ContentType })
    @IsString()
    @IsOptional()
    contentType?: ContentType;
}