import {
    IsString,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsEmail,
    IsPhoneNumber,
    IsDateString,
    IsNumber,
    Min,
    MaxLength,
    IsBoolean,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SupporterType, RequestSupporterStatus } from "../request-supporter.entity";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

class SocialLinksDto {
    @ApiPropertyOptional({ example: 'instagram', description: 'لینک اینستاگرام' })
    @IsOptional()
    @IsString()
    instagram?: string;

    @ApiPropertyOptional({ example: 'telegram', description: 'لینک تلگرام' })
    @IsOptional()
    @IsString()
    telegram?: string;

    @ApiPropertyOptional({ example: 'linkedin', description: 'لینک لینکدین' })
    @IsOptional()
    @IsString()
    linkedin?: string;

    @ApiPropertyOptional({ example: 'twitter', description: 'لینک توییتر' })
    @IsOptional()
    @IsString()
    twitter?: string;
}

export class CreateRequestSupporterDto {
    @ApiProperty({ example: 'علی', description: 'نام حامی (حداکثر ۱۰۰ کاراکتر)' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    firstName: string;

    @ApiProperty({ example: 'رضایی', description: 'نام خانوادگی حامی (حداکثر ۱۰۰ کاراکتر)' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    lastName: string;

    @ApiProperty({ example: '/avatar.png', description: 'آواتار' })
    @IsString()
    avatar: string;

    @ApiProperty({ example: '+989123456789', description: 'شماره تلفن حامی (فرمت ایران)' })
    @IsPhoneNumber('IR')
    @IsNotEmpty()
    phone: string;

    @ApiPropertyOptional({ example: 'supporter@example.com', description: 'ایمیل حامی' })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional({ example: 'mypassword123', description: 'رمز عبور حامی' })
    @IsOptional()
    @IsString()
    password?: string;

    @ApiProperty({ example: SupporterType.FINANCIAL, description: 'نوع حامی', enum: SupporterType })
    @IsEnum(SupporterType)
    type: SupporterType;

    @ApiPropertyOptional({ example: '2025-12-05T09:16:00Z', description: 'تاریخ عضویت', type: String, format: 'date-time' })
    @IsOptional()
    @IsDateString()
    joinDate?: string;

    @ApiPropertyOptional({ example: RequestSupporterStatus.PENDING, description: 'وضعیت درخواست', enum: RequestSupporterStatus })
    @IsOptional()
    @IsEnum(RequestSupporterStatus)
    status?: RequestSupporterStatus;

    @ApiPropertyOptional({ example: 500000, description: 'مبلغ اولیه حمایت (باید >= 0 باشد)' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    initialAmount?: number;

    @ApiPropertyOptional({ example: 'خراسان شمالی، شیروان', description: 'استان و شهر' })
    @IsOptional()
    @IsString()
    province?: string;

    @ApiPropertyOptional({ example: 'شیروان', description: 'شهر' })
    @IsOptional()
    @IsString()
    city?: string;

    @ApiPropertyOptional({ example: 'تجربه کار در مورد حامی حیوانات', description: 'تجربه' })
    @IsOptional()
    @IsString()
    experience?: string;

    @ApiPropertyOptional({ example: 'انگیزه من برای حمایت', description: 'انگیزه' })
    @IsOptional()
    @IsString()
    motivation?: string;

    @ApiPropertyOptional({ example: true, description: 'آیا با قوانین موافق است؟' })
    @IsOptional()
    @IsBoolean()
    agreement?: boolean;

    @ApiPropertyOptional({ example: true, description: 'نمایش در لیست عمومی' })
    @IsOptional()
    @IsBoolean()
    showInList?: boolean;

    @ApiPropertyOptional({ description: 'لینک‌های اجتماعی' })
    @IsOptional()
    @ValidateNested()
    @Type(() => SocialLinksDto)
    socialLinks?: SocialLinksDto;

    @ApiPropertyOptional({ example: 'یادداشت‌های اضافی درباره حامی', description: 'یادداشت‌ها' })
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiPropertyOptional({ example: 'user-12345', description: 'شناسه کاربر مرتبط' })
    @IsOptional()
    @IsString()
    userId?: string;
}