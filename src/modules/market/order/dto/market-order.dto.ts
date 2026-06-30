// market-order.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min,
    ValidateNested, IsNotEmpty} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * روش‌های پرداخت پشتیبانی شده در مارکت
 */
export enum MarketPaymentMethodEnum {
    WALLET = 'wallet',
    ONLINE = 'online',
    CASH = 'cash',
    CARD = 'card',
    COD = 'cod',
}

/**
 * اطلاعات بازه زمانی تحویل
 */
export class MarketDeliveryTimeSlotDto {
    @ApiProperty({ example: 1, description: 'شناسه بازه زمانی' })
    @IsNumber()
    id: number;

    @ApiProperty({ example: 'ساعت ۹ تا ۱۲', description: 'عنوان بازه زمانی' })
    @IsString()
    time: string;

    @ApiProperty({ example: true, description: 'در دسترس بودن بازه' })
    @IsBoolean()
    available: boolean;
}

/**
 * اطلاعات تاریخ تحویل
 */
export class MarketDeliveryDateDto {
    @ApiProperty({ example: '2026-01-22', description: 'تاریخ میلادی' })
    @IsString()
    date: string;

    @ApiProperty({ example: '۳ بهمن', description: 'برچسب تاریخ شمسی' })
    @IsString()
    dateLabel: string;

    @ApiProperty({ example: '۳', description: 'روز ماه' })
    @IsString()
    dateNum: string;

    @ApiProperty({ example: 'فردا', description: 'نام نسبی روز' })
    @IsString()
    dayName: string;

    @ApiProperty({ example: false, description: 'آیا روز جمعه است؟' })
    @IsBoolean()
    isFriday: boolean;

    @ApiProperty({ example: 'بهمن', description: 'نام ماه' })
    @IsString()
    monthName: string;

    @ApiProperty({ example: 'پنجشنبه', description: 'نام روز هفته' })
    @IsString()
    weekDay: string;
}

/**
 * آیتم سفارش در مارکت
 * نکته: قیمت‌ها فقط جهت اعتبارسنجی اولیه هستند. قیمت نهایی در سرویس محاسبه می‌شود.
 */
export class MarketOrderItemDto {
    @ApiProperty({ example: 'item-uuid', description: 'شناسه موقت آیتم در سبد خرید' })
    @IsUUID()
    @IsNotEmpty()
    id: string;

    @ApiProperty({ example: 2, description: 'تعداد' })
    @IsNumber()
    @Min(1)
    quantity: number;

    @ApiProperty({ example: 'shop-uuid', description: 'شناسه فروشگاه' })
    @IsUUID()
    shopId: string;

    @ApiProperty({ example: 'product-uuid', description: 'شناسه محصول در دیتابیس' })
    @IsOptional()
    @IsUUID()
    productId?: string;

    @ApiPropertyOptional({ example: 'variant-uuid', description: 'شناسه واریانت' })
    @IsOptional()
    @IsUUID()
    variantId?: string;

}

/**
 * DTO اصلی ثبت سفارش در مارکت
 */
export class MarketSubmitOrderDto {
    @ApiProperty({ example: 'address-uuid', description: 'شناسه آدرس تحویل' })
    @IsUUID()
    addressId: string;

    @ApiProperty({ type: MarketDeliveryDateDto, description: 'تاریخ تحویل' })
    @ValidateNested()
    @Type(() => MarketDeliveryDateDto)
    deliveryDate: MarketDeliveryDateDto;

    @ApiProperty({ type: MarketDeliveryTimeSlotDto, description: 'بازه زمانی تحویل' })
    @ValidateNested()
    @Type(() => MarketDeliveryTimeSlotDto)
    deliveryTimeSlot: MarketDeliveryTimeSlotDto;

    @ApiProperty({ type: [MarketOrderItemDto], description: 'لیست محصولات' })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => MarketOrderItemDto)
    items: MarketOrderItemDto[];

    @ApiPropertyOptional({ example: 'DISCOUNT20', description: 'کد تخفیف' })
    @IsOptional()
    @IsString()
    discountCode?: string | null;

    @ApiProperty({
        enum: MarketPaymentMethodEnum,
        example: MarketPaymentMethodEnum.WALLET,
        description: 'روش پرداخت'
    })
    @IsEnum(MarketPaymentMethodEnum)
    paymentMethod: MarketPaymentMethodEnum;

    @ApiProperty({ example: 'seller-uuid', description: 'شناسه فروشنده اصلی' })
    @IsUUID()
    sellerId: string;

    @ApiProperty({ example: 'shopCourier', description: 'روش ارسال' })
    @IsString()
    shippingMethod: string;

    @ApiPropertyOptional({ example: 'توضیحات تحویل', description: 'یادداشت سفارش' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    notes?: string;
}