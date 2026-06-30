import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO برای نمایش خطاهای اعتبارسنجی (Validation Errors)
 * این کلاس معمولاً در پاسخ‌های 400 Bad Request استفاده می‌شود.
 */
export class ValidationErrorDto {
    @ApiProperty({
        example: 'productId',
        description: 'نام فیلدی که خطا در آن رخ داده است',
    })
    field: string;

    @ApiProperty({
        example: 'validation failed',
        description: 'پیام خطای اعتبارسنجی',
    })
    message: string;
}

/**
 * DTO برای نمایش خطاهای عمومی (General Errors)
 * این کلاس برای پاسخ‌های 400 (خطای تجاری)، 401 (احراز هویت)، 403 (دسترسی) و 404 استفاده می‌شود.
 */
export class ErrorResponseDto {
    @ApiProperty({
        example: false,
        description: 'وضعیت درخواست (همیشه false برای خطا)',
    })
    success: boolean = false;

    @ApiProperty({
        example: 'INSUFFICIENT_BALANCE',
        description: 'کد خطا برای پردازش سمت کلاینت',
    })
    error: {
        code: string;
        message: string;
    };

    @ApiProperty({
        example: null,
        description: 'جزئیات خطا (اختیاری، معمولاً برای خطاهای پیچیده)',
        nullable: true,
        required: false,
    })
    details?: any = null;
}

/**
 * DTO برای نمایش خطاهای اعتبارسنجی دسته‌جمعی (Array of Validation Errors)
 * وقتی چندین فیلد خطا داشته باشیم، این ساختار بهتر است.
 */
export class ValidationErrorsResponseDto {
    @ApiProperty({ example: false })
    success: boolean = false;

    @ApiProperty({
        type: [ValidationErrorDto],
        description: 'لیست تمام فیلدهایی که خطا دارند',
        example: [
            { field: 'email', message: 'email must be an email' },
            { field: 'password', message: 'password must be longer than or equal to 8 characters' },
        ],
    })
    errors: ValidationErrorDto[];
}