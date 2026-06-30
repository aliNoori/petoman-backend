import {
    IsString,
    IsOptional,
    IsNumber,
    IsNotEmpty,
    Min,
    MaxLength
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {Type} from "class-transformer";

export class CreateServiceDto {
    @ApiProperty({ example: 'معاینه عمومی' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name: string;

    @ApiPropertyOptional({ example: 'بررسی کلی وضعیت سلامت حیوان خانگی' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ example: 150000, description: 'قیمت به تومان (عدد)' })
    @IsNumber()
    @IsNotEmpty()
    @Min(0)
    @Type(() => Number)
    price: number;
}

export class UpdateServiceDto {
    @ApiPropertyOptional({ example: 'معاینه تخصصی' })
    @IsString()
    @IsOptional()
    @MaxLength(100)
    name?: string;

    @ApiPropertyOptional({ example: 'توضیحات جدید' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ example: 200000 })
    @IsNumber()
    @IsOptional()
    @Min(0)
    @Type(() => Number)
    price?: number;
}