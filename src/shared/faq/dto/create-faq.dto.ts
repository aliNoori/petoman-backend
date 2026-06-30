import {IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min} from 'class-validator';
import {ContentType, FaqStatus} from "../faq.entity";
import {ApiProperty, ApiPropertyOptional} from "@nestjs/swagger";

export class CreateFaqDto {
    @ApiPropertyOptional({ example: 1, description: 'ترتیب نمایش سوال (باید >= 1 باشد)' })
    @IsInt()
    @IsOptional()
    @Min(1)
    order: number;

    @ApiProperty({ example: 'چطور می‌توانم ثبت‌نام کنم؟', description: 'متن سوال' })
    @IsString()
    @IsNotEmpty()
    question: string;

    @ApiProperty({ example: 'برای ثبت‌نام کافیست فرم مربوطه را پر کنید.', description: 'پاسخ سوال' })
    @IsString()
    @IsNotEmpty()
    answer: string;

    @ApiPropertyOptional({ example: 'category-123', description: 'شناسه دسته‌بندی سوال' })
    @IsString()
    @IsOptional()
    categoryId: string;

    @ApiProperty({ example: FaqStatus.ACTIVE, description: 'وضعیت سوال', enum: FaqStatus })
    @IsEnum(FaqStatus)
    status: FaqStatus;

    @ApiPropertyOptional({ example: ContentType.SUPPORTER, description: 'نوع محتوا', enum: ContentType })
    @IsString()
    @IsOptional()
    contentType?: ContentType;

    @ApiPropertyOptional({ example: 'عنوان محتوا', description: 'عنوان محتوا' })
    @IsString()
    @IsOptional()
    contentTitle?: string;

    @ApiPropertyOptional({ example: true, description: 'آیا سوال فعال است؟' })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({ example: '#FF5733', description: 'رنگ مرتبط با سوال' })
    @IsOptional()
    @IsString()
    color?: string;

    @ApiPropertyOptional({ example: 'این سوال مربوط به بخش ثبت‌نام است.', description: 'توضیحات اضافی' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'شناسه نوع (UUID)' })
    @IsOptional()
    @IsUUID()
    typeId?: string | null;
}