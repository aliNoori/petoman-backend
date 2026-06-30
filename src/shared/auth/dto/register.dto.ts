// src/auth/dto/register.dto.ts

import {IsArray, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength} from 'class-validator';
import {ApiProperty, ApiPropertyOptional} from "@nestjs/swagger";
import {UserRole} from "../../user/entities/user.entity";

export class RegisterDto {
    @ApiProperty({ example: 'user@example.com', description: 'ایمیل کاربر' })
    @IsEmail()
    @IsOptional()
    email?: string;

    @ApiProperty({ example: 'علی رضایی', description: 'نام کامل کاربر' })
    @IsOptional()
    @IsNotEmpty()
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

    @ApiPropertyOptional({ example: '+989123456789', description: 'شماره تلفن' })
    @IsOptional()
    @IsString()
    phoneNumber?: string;

    @ApiPropertyOptional({ example: '3456', description: 'کد تایید' })
    @IsOptional()
    @IsString()
    code?: string;

    @ApiProperty({ example: 'mypassword123', description: 'رمز عبور (حداقل ۸ کاراکتر)' })
    @MinLength(8)
    @IsOptional()
    password?: string;

    @ApiPropertyOptional({ example: 'https://example.com/avatar.png', description: 'آواتار کاربر' })
    @IsOptional()
    @IsString()
    avatar?: string;

    @ApiPropertyOptional({ example: [UserRole.DANIM_ADMIN], description: 'نقش‌های کاربر', enum: UserRole, isArray: true })
    @IsOptional()
    @IsArray()
    @IsEnum(UserRole, { each: true })
    legacyRoles?: UserRole[];
}