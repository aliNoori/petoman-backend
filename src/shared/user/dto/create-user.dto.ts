import {
    IsArray,
    IsEmail,
    IsEnum,
    IsOptional,
    IsString,
    MinLength,
    IsDate, IsBoolean, IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '../entities/user.entity';
import {ApiProperty, ApiPropertyOptional} from "@nestjs/swagger";

export class CreateUserDto {
    @ApiProperty({ example: 'علی رضایی', description: 'نام کامل کاربر' })
    @IsOptional()
    @IsString()
    fullName?: string;

    @ApiProperty({ example: 'علی', description: 'نام کاربر' })
    @IsOptional()
    @IsNotEmpty()
    firstName?: string;

    @ApiProperty({ example: 'رضایی', description: 'فامیل کاربر' })
    @IsOptional()
    @IsNotEmpty()
    lastName?: string;

    @ApiPropertyOptional({ example: 'ali_reza', description: 'نام کاربری' })
    @IsOptional()
    @IsString()
    username?: string;

    @ApiProperty({ example: 'petoman@example.com', description: 'ایمیل کاربر' })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiProperty({ example: '12345678', description: 'رمز عبور (حداقل 8 کاراکتر)' })
    @IsString()
    @IsOptional()
    @MinLength(6)
    password?: string;

    @ApiPropertyOptional({ example: '+989123456789', description: 'شماره تلفن' })
    @IsOptional()
    @IsString()
    phoneNumber?: string;

    @ApiPropertyOptional({ example: '2025-12-05T09:16:00Z', description: 'تایید موبایل', type: String, format: 'date-time' })
    @IsOptional()
    @Type(() => Date)
    @IsDate()
    phoneVerifiedAt?: Date;

    @ApiPropertyOptional({ example: '3456', description: 'کد تایید' })
    @IsOptional()
    @IsString()
    code?: string;

    @ApiPropertyOptional({ example: '1995-05-20T00:00:00Z', description: 'تاریخ تولد', type: String, format: 'date-time' })
    @IsOptional()
    @Type(() => Date)
    @IsDate()
    dateOfBirth?: Date;

    @ApiPropertyOptional({ example: 'https://example.com/avatar.png', description: 'آواتار کاربر//از بخش آپلود لینک را دریافت کنید.' })
    @IsOptional()
    @IsString()
    avatar?: string;

    @ApiPropertyOptional({ example: 'بیوگارفی', description: 'من در شرکت کار می کنم' })
    @IsOptional()
    @IsString()
    bio?: string;

    @ApiPropertyOptional({ example: [UserRole.ADMIN, UserRole.DANIM_ADMIN], description: 'نقش‌های کاربر', enum: UserRole, isArray: true })
    @IsOptional()
    @IsArray()
    @IsEnum(UserRole, { each: true })
    legacyRoles?: UserRole[];

    @ApiPropertyOptional({ example: true, description: 'آیا کاربر فعال است؟' })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({ example: '2025-12-05T09:16:00Z', description: 'آخرین ورود کاربر', type: String, format: 'date-time' })
    @IsOptional()
    @Type(() => Date)
    @IsDate()
    lastLogin?: Date;
}