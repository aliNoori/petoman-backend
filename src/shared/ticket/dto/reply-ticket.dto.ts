import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class ReplyTicketDto {
    @ApiProperty({
        description: 'متن پیام',
        example: 'سلام، لطفاً اسکرین‌شات خطا را ارسال کنید.',
    })
    @IsString()
    @IsNotEmpty()
    content: string;

    @ApiProperty({
        description: 'لیست لینک‌های فایل‌های پیوست (تصاویر یا مستندات)',
        type: [String],
        required: false,
        example: ['https://example.com/uploads/image1.jpg', 'https://example.com/uploads/file.pdf'],
    })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    attachments?: string[];

    @ApiProperty({
        description: 'آیا فرستنده ادمین است؟ (معمولاً از سمت سرور پر می‌شود اما اگر نیاز بود از فرانت ارسال شود)',
        required: false,
        default: false,
    })
    @IsBoolean()
    @IsOptional()
    isAdmin?: boolean;
}