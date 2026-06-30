import {IsString, IsOptional, IsBoolean, MaxLength, Matches} from 'class-validator';
import {ApiProperty, ApiPropertyOptional} from "@nestjs/swagger";

export class CreateFaqTypeDto {
    @ApiProperty({
        example: 'faq-type-1',
        description: 'نام نوع سوال (فقط حروف انگلیسی، عدد، فاصله، خط تیره یا زیرخط)',
        maxLength: 100,
    })
    @IsString()
    @MaxLength(100)
    @Matches(/^[A-Za-z0-9 _-]+$/, {
        message: 'name فقط می‌تواند شامل حروف انگلیسی، عدد، فاصله، خط تیره یا زیرخط باشد',
    })
    name: string;

    @ApiPropertyOptional({
        example: 'سوالات عمومی',
        description: 'نام نمایشی نوع سوال (فقط حروف فارسی)',
        maxLength: 200,
    })
    @IsString()
    @MaxLength(200)
    @Matches(/^[\u0600-\u06FF\s‌ء-ي،٫٬؟]+$/, {
        message: 'displayName فقط می‌تواند شامل حروف فارسی باشد',
    })
    displayName?: string;

    @ApiPropertyOptional({
        example: true,
        description: 'آیا نوع سوال فعال است؟',
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}