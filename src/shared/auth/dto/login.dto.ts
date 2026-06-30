// src/auth/dto/login.dto.ts

import {IsEmail, IsOptional, IsString} from 'class-validator';
import {ApiProperty} from "@nestjs/swagger";

export class LoginDto {
    @ApiProperty({ example: 'user@example.com', description: 'ایمیل کاربر' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'mypassword123', description: 'رمز عبور کاربر' })
    @IsString()
    password: string;

    @ApiProperty({ example: 'hash_key', description: 'tenant_id' })
    @IsString()
    @IsOptional()
    tenantId?: string;

}