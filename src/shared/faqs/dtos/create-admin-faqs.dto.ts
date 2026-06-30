import { IsString, IsBoolean, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAdminFaqDto {
    @ApiProperty({ example: 'market' })
    @IsString()
    @IsNotEmpty()
    section: string;

    @ApiProperty({ example: 1 })
    @IsString()
    @IsNotEmpty()
    categoryId: string;

    @ApiProperty({ example: 'چگونه فروشگاه خود را ثبت کنم؟' })
    @IsString()
    @IsNotEmpty()
    question: string;

    @ApiProperty({ example: 'از بخش ثبت فروشگاه...' })
    @IsString()
    @IsNotEmpty()
    answer: string;

    @ApiProperty({ example: true, required: false })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}