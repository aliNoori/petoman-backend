import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsArray,
    IsBoolean,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    Min,
    ValidateNested,
    IsNotEmpty,
    IsObject
} from 'class-validator';
import { Type } from 'class-transformer';

// --- DTO جدید برای اطلاعات مشتری ---
class CustomerInfoDto {
    @ApiProperty({ example: 'علی' })
    @IsString()
    firstName: string;

    @ApiProperty({ example: 'محمدی' })
    @IsString()
    lastName: string;

    @ApiProperty({ example: '09123456789' })
    @IsString()
    phone: string;

    @ApiPropertyOptional({ example: 'ali@example.com' })
    @IsOptional()
    @IsString()
    email?: string;
}

class OrderItemDto {
    @ApiProperty({ example: '99a97029-6349-45c5-b75f-6068606c8e32' })
    @IsUUID()
    @IsNotEmpty()
    id: string;

    @ApiProperty({ example: 'اسپری بهداشتی گربه...' })
    @IsString()
    name: string;

    @ApiProperty({ example: 486000 })
    @IsNumber()
    price: number;

    @ApiProperty({ example: 600000 })
    @IsNumber()
    @IsOptional()
    originalPrice?: number;

    @ApiProperty({ example: 3 })
    @IsNumber()
    @Min(1)
    quantity: number;

    @ApiPropertyOptional()
    @IsOptional()
    discount?: number;

    @ApiPropertyOptional()
    @IsOptional()
    available?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    pharmacyId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    productId?: string;

    // اصلاحیه مهم: تغییر نوع به object برای قبول کردن null
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    shop?: string; // قبول میکند: {} یا null

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    categoryId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    rating?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isFavorite?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsObject()
    brand?: object;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    category?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    reviewCount?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsArray()
    reviews?: any[];


    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    description?: string;


    @ApiPropertyOptional()
    @IsOptional()
    @IsArray()
    images?: any[];


    @ApiPropertyOptional()
    @IsOptional()
    @IsObject()
    seller?: object;

    @ApiPropertyOptional()
    @IsOptional()
    @IsArray()
    relatedProducts?: any[];
}

// --- Main DTO ---
export class SubmitOrderMedicineDto {
    @ApiProperty({ example: '552ed581-5488-4c46-a2b1-485f46da3ab4' })
    @IsUUID()
    addressId: string;

    @ApiProperty({ type: [OrderItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OrderItemDto)
    items: OrderItemDto[];

    @ApiProperty({ example: 'd863b0bf-ef02-40c2-a654-6a19102380b1' })
    @IsUUID()
    sellerId: string;

    @ApiProperty({ example: 'shopCourier' })
    @IsString()
    shippingMethod: string;

    @ApiProperty({ example: 200000 })
    @IsNumber()
    shippingCost: number;

    @ApiPropertyOptional({ type: CustomerInfoDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => CustomerInfoDto)
    customerInfo?: CustomerInfoDto;

    @ApiPropertyOptional({ example: 'Please deliver carefully' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    notes?: string;
}