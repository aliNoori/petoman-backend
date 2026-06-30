import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray, IsEmail, MinLength } from 'class-validator';

export class CreateAdminDto {
    @ApiProperty({ example: 'علی علوی' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'ali@example.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: '09123456789' })
    @IsString()
    @IsNotEmpty()
    phone: string;

    @ApiProperty({ example: '123456' })
    @IsString()
    @MinLength(6)
    password: string;

    @ApiPropertyOptional({ example: ['1', '2'], type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    roleIds?: string[];
}