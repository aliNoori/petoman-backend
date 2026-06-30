import {
    IsString,
    IsNotEmpty,
    IsEnum,
    IsOptional,
    IsDateString,
    MaxLength,
    IsArray,
    Matches, isArray, IsInt, Min,
} from 'class-validator';
import { DocumentaryStatus } from '../documentary.entity';
import {ApiProperty, ApiPropertyOptional} from "@nestjs/swagger";

export class CreateDocumentaryDto {
    @ApiProperty({ example: 'مستند طبیعت ایران', description: 'عنوان مستند (حداکثر ۱۵۰ کاراکتر)' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    title: string;

    @ApiProperty({ example: 'این مستند درباره حیات وحش ایران است.', description: 'توضیحات مستند' })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiPropertyOptional({ example: 'https://example.com/thumbnail.jpg', description: 'تصویر پیش‌نمایش' })
    @IsOptional()
    @IsString()
    thumbnailPreview: string;

    @ApiPropertyOptional({ example: 'https://example.com/video.mp4', description: 'لینک ویدئو' })
    @IsOptional()
    @IsString()
    videoUrl?: string;

    @ApiPropertyOptional({ example: 'documentary.mp4', description: 'فایل ویدئو آپلود شده' })
    @IsOptional()
    @IsString()
    videoFile?: string;

    @ApiProperty({ example: '12:45', description: 'مدت زمان مستند (فرمت mm:ss یا h:mm)' })
    @IsString()
    @Matches(/^\d{1,2}:\d{2}$/)
    duration: string;

    @ApiPropertyOptional({ example: ['طبیعت', 'حیات وحش'], description: 'برچسب‌های مستند', type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @ApiProperty({ example: '2025-12-05', description: 'تاریخ انتشار مستند', type: String, format: 'date' })
    @IsDateString()
    publishDate: string;

    @ApiProperty({ example: DocumentaryStatus.PUBLISHED, description: 'وضعیت مستند', enum: DocumentaryStatus })
    @IsEnum(DocumentaryStatus)
    status: DocumentaryStatus;

    @ApiPropertyOptional({ example: 'مستند طبیعت', description: 'عنوان سئو (حداکثر ۶۰ کاراکتر)' })
    @IsOptional()
    @IsString()
    @MaxLength(60)
    seoTitle?: string;

    @ApiPropertyOptional({ example: 'مستند جذاب درباره طبیعت ایران', description: 'توضیحات سئو (حداکثر ۱۶۰ کاراکتر)' })
    @IsOptional()
    @IsString()
    @MaxLength(160)
    seoDescription?: string;

    @ApiPropertyOptional({ example: 'طبیعت, ایران, مستند', description: 'کلمات کلیدی سئو' })
    @IsOptional()
    @IsString()
    seoKeywords?: string;

    @ApiProperty({ example: 'iran-nature-doc', description: 'اسلاگ مستند (برای URL)' })
    @IsString()
    slug: string;

    @ApiProperty({ example: 'category-123', description: 'شناسه دسته‌بندی مستند' })
    @IsString()
    @IsNotEmpty()
    categoryId: string;

    @ApiPropertyOptional({ example: 100, description: 'تعداد بازدیدها (پیش‌فرض ۱)' })
    @IsInt()
    @Min(0)
    @IsOptional()
    views: number = 1;
}
