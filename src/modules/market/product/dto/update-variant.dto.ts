// src/modules/market/products/dto/update-variant.dto.ts
import { IsOptional, IsString, IsNumber, IsBoolean, IsObject } from 'class-validator';

export class UpdateVariantDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsObject()
    attributes?: Record<string, any>;

    @IsOptional()
    @IsNumber()
    price?: number;

    @IsOptional()
    @IsNumber()
    stock?: number;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsString()
    image?: string;
}