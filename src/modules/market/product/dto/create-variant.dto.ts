// src/modules/market/products/dto/create-variant.dto.ts
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductVariantDto {

    @IsOptional()
    @IsString()
    id?: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    // اضافه کردن @IsObject() برای رفع ارور "property should not exist"
    // این دکوراتور تایید می‌کند که مقدار ارسالی یک آبجکت است
    @IsObject()
    attributes: Record<string, any>;

    @IsNumber()
    @IsNotEmpty()
    price: number;

    @IsNumber()
    @IsNotEmpty()
    stock: number;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @IsString()
    @IsOptional()
    image?: string;
}

export class BulkCreateVariantsDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateProductVariantDto)
    variants: CreateProductVariantDto[];
}