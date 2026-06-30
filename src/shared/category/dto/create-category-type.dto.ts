import {IsString, IsOptional, IsBoolean, MaxLength, Matches} from 'class-validator';

export class CreateCategoryTypeDto {
    @IsString()
    @MaxLength(100)
    @Matches(/^[A-Za-z0-9 _-]+$/, {
        message: 'name فقط می‌تواند شامل حروف انگلیسی، عدد، فاصله، خط تیره یا زیرخط باشد',
    })
    name: string;

    //@IsOptional()
    @IsString()
    @MaxLength(200)
    @Matches(/^[\u0600-\u06FF\s‌ء-ي،٫٬؟]+$/, {
        message: 'displayName فقط می‌تواند شامل حروف فارسی باشد',
    })
    displayName?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}