// src/modules/pets/dto/create-pet.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsNumber, IsBoolean, IsUUID } from 'class-validator';
import { PetType } from "../../entities/pet.entity";
import { Type } from 'class-transformer'; // برای تبدیل رشته به عدد

export class CreatePetDto {
    @ApiProperty({ example: 'میلو' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ enum: PetType, example: PetType.DOG })
    @IsEnum(PetType)
    @IsNotEmpty()
    type: PetType;

    @ApiProperty({ example: 'شیتزو', required: false })
    @IsString()
    @IsOptional()
    breed?: string;

    @ApiProperty({ example: 2, required: false })
    @IsNumber()
    @IsOptional()
    @Type(() => Number) // تبدیل رشته ورودی به عدد
    age?: number;

    @ApiProperty({ example: 'نر', required: false })
    @IsString()
    @IsOptional()
    gender?: string;

    @ApiProperty({ example: 5.5, required: false, description: 'وزن به کیلوگرم' })
    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    weight?: number;

    @ApiProperty({ example: 'مشکی', required: false })
    @IsString()
    @IsOptional()
    color?: string;

    @ApiProperty({ example: '123456789', required: false, description: 'شماره میکروچیپ' })
    @IsString()
    @IsOptional()
    microchip?: string;

    @ApiProperty({ example: false, required: false, description: 'آیا حیوان عقیم شده است؟' })
    @IsBoolean()
    @IsOptional()
    @Type(() => Boolean)
    isNeutered?: boolean;

    @ApiProperty({ example: 'حساسیت به غذای خشک', required: false })
    @IsString()
    @IsOptional()
    medicalHistory?: string;

    @ApiProperty({ required: false, description: 'توضیحات تکمیلی' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ required: false, type: 'string', format: 'binary', description: 'تصویر پروفایل حیوان' })
    @IsString()
    logo?: string;
}