import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    Min,
    ValidateNested,
    IsNotEmpty,
    IsDateString,
    IsObject
} from 'class-validator';
import { Type } from 'class-transformer';

// --- Enums ---
export enum PaymentMethodEnum {
    WALLET = 'wallet',
    ONLINE = 'online',
    CASH = 'cash',
    CARD = 'card',
    COD = 'cod',
}

// --- Nested DTOs ---

class DeliveryTimeSlotDto {
    @ApiProperty({ example: 1 })
    @IsNumber()
    id: number;

    @ApiProperty({ example: 'ساعت ۹ تا ۱۲' })
    @IsString()
    time: string;

    @ApiProperty({ example: 0 })
    @IsNumber()
    price: number;

    @ApiProperty({ example: true })
    @IsBoolean()
    available: boolean;
}
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

class DeliveryDateDto {
    @ApiProperty({ example: '2026-01-22' })
    @IsString()
    date: string;

    @ApiProperty({ example: '۳ بهمن' })
    @IsString()
    dateLabel: string;

    @ApiProperty({ example: '۳' })
    @IsString()
    dateNum: string;

    @ApiProperty({ example: 'فردا' })
    @IsString()
    dayName: string;

    @ApiProperty({ example: false })
    @IsBoolean()
    isFriday: boolean;

    @ApiProperty({ example: 'بهمن' })
    @IsString()
    monthName: string;

    @ApiProperty({ example: 'پنجشنبه' })
    @IsString()
    weekDay: string;
}

class OrderItemDto {
    @ApiProperty({ example: '99a97029-6349-45c5-b75f-6068606c8e32' })
    @IsUUID()
    @IsNotEmpty()
    id: string;

    @ApiProperty({ example: 3 })
    @IsNumber()
    @Min(1)
    quantity: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    shopId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    productId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    variantId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    description?: string;
}
class MedicineItemDto {
    @ApiProperty({ example: '395f2afa-4c0d-475d-b60a-181886abeb08' })
    @IsUUID()
    id: string;

    @ApiProperty({ example: 2 })
    @IsNumber()
    qty: number;
}

// --- Main DTO ---
export class PharmacyOrderDto {
    @ApiProperty({ example: '552ed581-5488-4c46-a2b1-485f46da3ab4' })
    @IsUUID()
    addressId: string;

    @ApiProperty({ type: DeliveryDateDto })
    @ValidateNested()
    @Type(() => DeliveryDateDto)
    deliveryDate: DeliveryDateDto;

    @ApiProperty({ type: DeliveryTimeSlotDto })
    @ValidateNested()
    @Type(() => DeliveryTimeSlotDto)
    deliveryTimeSlot: DeliveryTimeSlotDto;

    @ApiProperty({ type: [OrderItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OrderItemDto)
    items: OrderItemDto[];

    @ApiPropertyOptional({ example: 'DISCOUNT20' })
    @IsOptional()
    @IsString()
    discountCode?: string | null;

    @ApiProperty({
        enum: PaymentMethodEnum,
        example: PaymentMethodEnum.WALLET,
    })
    @IsEnum(PaymentMethodEnum)
    paymentMethod: PaymentMethodEnum;

    @ApiProperty({ example: 'd863b0bf-ef02-40c2-a654-6a19102380b1' })
    @IsUUID()
    sellerId: string;

    @ApiProperty({ example: 'shopCourier' })
    @IsString()
    shippingMethod: string;


    @ApiProperty({ example: 200000 })
    @IsOptional()
    @IsNumber()
    codFee?: number;


    @ApiPropertyOptional({ type: CustomerInfoDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => CustomerInfoDto)
    customerInfo?: CustomerInfoDto;

    @ApiPropertyOptional({ example: 'TRX123456789' })
    @IsOptional()
    @IsString()
    transactionId?: string;

    @ApiPropertyOptional({ example: 'Please deliver carefully' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    notes?: string;

    @ApiPropertyOptional({ example: 'prescription', enum: ['prescription', 'list'] })
    @IsOptional()
    @IsString()
    mode?: string;

    @ApiPropertyOptional({ type: [String], example: ['https://.../image.jpg'] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    prescriptionUrls?: string[];

    @ApiPropertyOptional({ type: [MedicineItemDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => MedicineItemDto)
    medicines?: MedicineItemDto[];
}