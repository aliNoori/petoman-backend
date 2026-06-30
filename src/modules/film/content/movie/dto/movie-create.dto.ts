import {IsString, IsBoolean, IsNumber, IsOptional, IsArray, IsEnum} from 'class-validator';
import {ApiProperty, ApiPropertyOptional} from "@nestjs/swagger";

export class CreateMovieDto {
    @ApiProperty({ example: 'movie', description: 'نوع آیتم (مثلاً movie یا series)' })
    @IsString()
    type: string;

    @ApiProperty({ example: 'جدایی نادر از سیمین', description: 'عنوان فیلم به فارسی' })
    @IsString()
    title: string;

    @ApiProperty({ example: 'A Separation', description: 'عنوان فیلم به انگلیسی' })
    @IsString()
    titleEn: string;

    @ApiProperty({ example: 'فیلمی درباره روابط انسانی و اجتماعی در ایران.', description: 'توضیحات فیلم' })
    @IsString()
    description: string;

    @ApiProperty({ example: 'اصغر فرهادی', description: 'کارگردان فیلم' })
    @IsString()
    director: string;

    @ApiProperty({ example: 'پیمان معادی، لیلا حاتمی', description: 'بازیگران فیلم' })
    @IsString()
    cast: string;

    @ApiPropertyOptional({ example: 'https://example.com/download.mp4', description: 'لینک دانلود فیلم' })
    @IsOptional()
    @IsString()
    downloadUrl?: string;

    @ApiProperty({ example: 120, description: 'مدت زمان فیلم (به دقیقه)' })
    @IsNumber()
    duration: number;

    @ApiProperty({ example: true, description: 'آیا فیلم ویژه است؟' })
    @IsBoolean()
    featured: boolean;

    @ApiPropertyOptional({ example: 8.5, description: 'امتیاز IMDb فیلم' })
    @IsOptional()
    @IsNumber()
    imdbRating?: number;

    @ApiPropertyOptional({ example: 'https://example.com/poster.jpg', description: 'پوستر فیلم' })
    @IsOptional()
    @IsString()
    poster?: string;

    @ApiPropertyOptional({ example: 'published', description: 'وضعیت فیلم (مثلاً draft یا published)' })
    @IsOptional()
    @IsString()
    status?: string;

    @ApiPropertyOptional({ example: ['درام', 'اجتماعی'], description: 'برچسب‌های فیلم', type: [String] })
    @IsOptional()
    @IsArray()
    tags?: string[];

    @ApiPropertyOptional({ example: 'https://example.com/trailer.mp4', description: 'لینک تریلر فیلم' })
    @IsOptional()
    @IsString()
    trailerUrl?: string;

    @ApiPropertyOptional({ example: 'https://example.com/video.mp4', description: 'لینک ویدئو فیلم' })
    @IsOptional()
    @IsString()
    videoLink?: string;

    @ApiPropertyOptional({ example: '1080p', description: 'کیفیت ویدئو' })
    @IsOptional()
    @IsString()
    videoQuality?: string;

    @ApiPropertyOptional({ example: 'mp4', description: 'نوع منبع ویدئو' })
    @IsOptional()
    @IsString()
    videoSourceType?: string;

    @ApiProperty({ example: 2011, description: 'سال تولید فیلم' })
    @IsNumber()
    year: number;

    @ApiProperty({ example: 'category-123', description: 'شناسه دسته‌بندی فیلم' })
    @IsString()
    categoryId: string;
}
