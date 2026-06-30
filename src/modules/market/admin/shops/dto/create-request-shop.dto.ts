import { ApiProperty } from '@nestjs/swagger';
import {IsString, IsOptional, IsArray, IsObject, IsEmail, IsIBAN, ValidateNested} from 'class-validator';
import {TenantType} from "../../../../../core/entities/tenant.entity";
import {Type} from "class-transformer";

class DocumentDto {
    @ApiProperty({ example: 'http://example.com/logo.png' })
    @IsString()
    thumbnail: string;

    @ApiProperty({ example: 'logo.png' })
    @IsString()
    name: string;

    @ApiProperty({ example: 'image/png' })
    @IsString()
    type: string;
}

class DocumentsWrapperDto {
    @ApiProperty({ type: DocumentDto, required: false })
    @IsOptional()
    @ValidateNested()
    @Type(() => DocumentDto)
    logo?: DocumentDto;

    @ApiProperty({ type: DocumentDto, required: false })
    @IsOptional()
    @ValidateNested()
    @Type(() => DocumentDto)
    license?: DocumentDto;

    @ApiProperty({ type: DocumentDto, required: false })
    @IsOptional()
    @ValidateNested()
    @Type(() => DocumentDto)
    nationalId?: DocumentDto;
}

export class CreateRequestShopDto {

    @ApiProperty({ example: 'MARKET', required: true })
    @IsString()
    type: TenantType;

    @ApiProperty({ example: 'My Pet Shop' })
    @IsString()
    shopName: string;

    @ApiProperty({ example: 'Ali Rezaei' })
    @IsString()
    ownerName: string;

    @ApiProperty({ example: '09123456789' })
    @IsString()
    phone: string;

    @ApiProperty({ example: 'info@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'Tehran, Street 1, No 12' })
    @IsString()
    address: string;

    @ApiProperty({ example: 'Tehran' })
    @IsString()
    province: string;

    @ApiProperty({ example: 'Tehran' })
    @IsString()
    city: string;

    @ApiProperty({ example: { lat: 35.6892, lng: 51.3890 }, required: false })
    @IsObject()
    @IsOptional()
    location?: { lat: number; lng: number };

    @ApiProperty({ example: ['food', 'toys'], required: false })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    categories?: string[];

    @ApiProperty({ example: 'IR123456789012345678901234' })
    @IsString()
    iban: string;

    @ApiProperty({
        description: 'Object containing uploaded documents (logo, license, nationalId) with metadata',
        required: false,
        type: DocumentsWrapperDto
    })
    @IsOptional()
    @ValidateNested()
    @Type(() => DocumentsWrapperDto)
    documents?: DocumentsWrapperDto;

    @ApiProperty({ example: 'دلیل رد یا ویرایش درخواست' })
    @IsString()
    @IsOptional()
    rejectionReason?: string;
}