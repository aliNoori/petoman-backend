import {IsString, IsOptional, IsNumber, IsArray, ValidateNested, IsBoolean} from 'class-validator';
import { Type } from 'class-transformer';
import {ApiProperty, ApiPropertyOptional} from "@nestjs/swagger";

export class EpisodeDto {
    @ApiPropertyOptional({ example: 1, description: 'شماره قسمت' })
    @IsOptional()
    @IsNumber()
    number?: number;

    @ApiProperty({ example: 'قسمت اول', description: 'عنوان قسمت' })
    @IsString()
    title: string;

    @ApiProperty({ example: 45, description: 'مدت زمان قسمت (به دقیقه)' })
    @IsNumber()
    duration: number;

    @ApiPropertyOptional({ example: 'mp4', description: 'نوع منبع ویدئو' })
    @IsOptional()
    @IsString()
    sourceType?: string;

    @ApiPropertyOptional({ example: '1080p', description: 'کیفیت ویدئو' })
    @IsOptional()
    @IsString()
    quality?: string;

    @ApiPropertyOptional({ example: 'https://example.com/video.mp4', description: 'لینک ویدئو' })
    @IsOptional()
    @IsString()
    videoUrl?: string;

    @ApiPropertyOptional({ example: true, description: 'آیا منوی انتخاب کیفیت نمایش داده شود؟' })
    @IsOptional()
    @IsBoolean()
    showQualityDropdown?: boolean;
}

class SeasonDto {
    @ApiProperty({ example: 1, description: 'شماره فصل' })
    @IsNumber()
    number: number;

    @ApiProperty({ example: 'فصل اول', description: 'عنوان فصل' })
    @IsString()
    title: string;

    @ApiPropertyOptional({ example: 'این فصل شامل ۱۰ قسمت است.', description: 'توضیحات فصل' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({
        type: [EpisodeDto],
        description: 'لیست قسمت‌های فصل',
        example: [
            { number: 1, title: 'قسمت اول', duration: 45 },
            { number: 2, title: 'قسمت دوم', duration: 50 }
        ]
    })
    @ValidateNested({ each: true })
    @Type(() => EpisodeDto)
    episodes: EpisodeDto[];
}

export class CreateSeriesDto {
    @ApiProperty({ example: 'سریال شهرزاد', description: 'عنوان سریال' })
    @IsString()
    title: string;

    @ApiPropertyOptional({ example: true, description: 'آیا سریال منتشر شده است؟' })
    @IsOptional()
    @IsBoolean()
    published?: boolean;

    @ApiPropertyOptional({ example: 'Shahrzad', description: 'عنوان سریال به انگلیسی' })
    @IsOptional()
    @IsString()
    titleEn?: string;

    @ApiPropertyOptional({ example: 'سریالی عاشقانه و تاریخی', description: 'توضیحات سریال' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ example: 'حسن فتحی', description: 'کارگردان سریال' })
    @IsOptional()
    @IsString()
    director?: string;

    @ApiPropertyOptional({ example: 'ترانه علیدوستی، مصطفی زمانی', description: 'بازیگران سریال' })
    @IsOptional()
    @IsString()
    actors?: string;

    @ApiPropertyOptional({ example: 'ایران', description: 'کشور تولیدکننده سریال' })
    @IsOptional()
    @IsString()
    country?: string;

    @ApiPropertyOptional({ example: 'فارسی', description: 'زبان سریال' })
    @IsOptional()
    @IsString()
    language?: string;

    @ApiPropertyOptional({ example: 'category-123', description: 'شناسه دسته‌بندی سریال' })
    @IsOptional()
    @IsString()
    categoryId?: string;

    @ApiPropertyOptional({ example: 'https://example.com/poster.jpg', description: 'پوستر سریال' })
    @IsOptional()
    @IsString()
    poster?: string;

    @ApiPropertyOptional({ example: 'published', description: 'وضعیت سریال (مثلاً draft یا published)' })
    @IsOptional()
    @IsString()
    status?: string;

    @ApiPropertyOptional({ example: 8.7, description: 'امتیاز سریال' })
    @IsOptional()
    @IsNumber()
    rating?: number;

    @ApiPropertyOptional({ example: ['درام', 'تاریخی'], description: 'برچسب‌های سریال', type: [String] })
    @IsOptional()
    @IsArray()
    tags?: string[];

    @ApiPropertyOptional({ example: 2015, description: 'سال تولید سریال' })
    @IsOptional()
    @IsNumber()
    year?: number;

    @ApiPropertyOptional({ example: true, description: 'آیا سریال ویژه است؟' })
    @IsOptional()
    @IsBoolean()
    featured?: boolean;

    @ApiPropertyOptional({ example: 'عاشقانه، تاریخی', description: 'کلمات کلیدی سریال' })
    @IsOptional()
    @IsString()
    keywords?: string;

    @ApiPropertyOptional({ example: 'PG-13', description: 'رده‌بندی سنی سریال' })
    @IsOptional()
    @IsString()
    ageRating?: string;

    @ApiProperty({
        type: [SeasonDto],
        description: 'لیست فصل‌های سریال',
        example: [
            {
                number: 1,
                title: 'فصل اول',
                episodes: [
                    { number: 1, title: 'قسمت اول', duration: 45 },
                    { number: 2, title: 'قسمت دوم', duration: 50 }
                ]
            }
        ]
    })
    @ValidateNested({ each: true })
    @Type(() => SeasonDto)
    seasons: SeasonDto[];
}