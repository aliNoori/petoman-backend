import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsObject, IsEmail, IsIBAN, ValidateNested, IsNumber, IsBoolean, IsUUID } from 'class-validator';
import { Transform, Type } from "class-transformer";
import { TenantType } from "../../../core/entities/tenant.entity";

// 3. ساختار هر سند در فیلد documents
class DocumentItemDto {
    @ApiProperty({ example: 'image/jpeg', required: false })
    @IsString()
    type: string;

    @ApiProperty({ example: 'http://localhost:3000/uploads/...', required: false })
    @IsString()
    thumbnail: string;

    @ApiProperty({ example: 'مدرک تحصیلی', required: false })
    @IsString()
    name: string;
}

// 4. کلاس نگهدارنده اسناد
class DocumentsWrapperDto {
    @ApiProperty({ type: DocumentItemDto, required: false })
    @IsOptional()
    @ValidateNested()
    @Type(() => DocumentItemDto)
    logo?: DocumentItemDto;

    @ApiProperty({ type: DocumentItemDto, required: false })
    @IsOptional()
    @ValidateNested()
    @Type(() => DocumentItemDto)
    license?: DocumentItemDto;

    @ApiProperty({ type: DocumentItemDto, required: false })
    @IsOptional()
    @ValidateNested()
    @Type(() => DocumentItemDto)
    nationalId?: DocumentItemDto;

    @ApiProperty({ type: DocumentItemDto, required: false })
    @IsOptional()
    @ValidateNested()
    @Type(() => DocumentItemDto)
    degree?: DocumentItemDto;

    @ApiProperty({ type: DocumentItemDto, required: false })
    @IsOptional()
    @ValidateNested()
    @Type(() => DocumentItemDto)
    selfie?: DocumentItemDto;

    @ApiProperty({ type: DocumentItemDto, required: false })
    @IsOptional()
    @ValidateNested()
    @Type(() => DocumentItemDto)
    personalPhoto?: DocumentItemDto;

    @ApiProperty({ type: DocumentItemDto, required: false })
    @IsOptional()
    @ValidateNested()
    @Type(() => DocumentItemDto)
    environment?: DocumentItemDto;

    @ApiProperty({ type: DocumentItemDto, required: false })
    @IsOptional()
    @ValidateNested()
    @Type(() => DocumentItemDto)
    video?: DocumentItemDto;
}

export class CreateRequestTenantDto {

    @ApiProperty({ example: 'VET', required: false })
    @IsOptional()
    @IsString()
    type: TenantType;

    @ApiProperty({ example: 'محمدی' })
    @IsString()
    name: string;

    @ApiProperty({ example: '09355851170' })
    @IsString()
    phone: string;

    @ApiProperty({ example: 'm@gmail.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsObject()
    address?: any;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    addressString?: string;

    @ApiProperty({ example: 'تهران' })
    @IsString()
    province: string;

    @ApiProperty({ example: 'تهران' })
    @IsString()
    city: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsObject()
    location?: { lat: number; lng: number };

    @ApiProperty({ required: false })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    services?: string[];

    @ApiProperty({ example: 'IR017000000000103808663006' })
    // @IsIBAN()
    @IsString()
    iban: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    specialty?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === '' || value === null || value === undefined) return undefined;
        return Number(value);
    })
    @IsNumber()
    experience?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    clinicName?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    description?: string;

    // --- فیلد documents ---
    @ApiProperty({ type: DocumentsWrapperDto, required: false })
    @IsOptional()
    @ValidateNested()
    @Type(() => DocumentsWrapperDto)
    documents?: DocumentsWrapperDto;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    rejectionReason?: string;
}