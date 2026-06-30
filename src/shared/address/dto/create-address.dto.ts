import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsObject, IsNumber, IsArray } from "class-validator";

export class CreateAddressDto {
    @ApiProperty({ example: 'Home' })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiPropertyOptional({ example: { lat: 35.6997621, lon: 51.3389295, display_name: "..."} })
    @IsObject()
    @IsOptional()
        // این فیلد کل آبجکت دریافتی از نقشه را ذخیره می‌کند.
        // اگر می‌خواهید فیلدها را تکه تکه بگیرید، می‌توانید فیلدهای جداگانه برای lat, lng, neighborhood و... اضافه کنید.
    fullAddress: any;

    @ApiPropertyOptional({ example: 'Tehran' })
    @IsString()
    @IsOptional()
    city?: string;

    @ApiPropertyOptional({ example: 'Tehran' })
    @IsString()
    @IsOptional()
    province?: string;

    @ApiProperty({ example: 'Ali Mohammadi' })
    @IsString()
    @IsNotEmpty()
    receiver: string;

    @ApiProperty({ example: '09123456789' })
    @IsString()
    @IsNotEmpty()
    phone: string;

    @ApiPropertyOptional({ example: '1234567890' })
    @IsString()
    @IsOptional()
    postalCode?: string;

    @IsString()
    @IsOptional()
    plaque?: string;

    @IsString()
    @IsOptional()
    unit?: string;

    @ApiPropertyOptional({ default: false })
    @IsBoolean()
    @IsOptional()
    isDefault?: boolean;

    // فیلدهای اختیاری برای همگام‌سازی مستقیم با Entity در صورت نیاز به استخراج از fullAddress
    @ApiPropertyOptional({ example: { lat: 35.759, lng: 51.412 } })
    @IsObject()
    @IsOptional()
    location?: { lat: number; lng: number };

    @ApiPropertyOptional({ example: 'استاد معین' })
    @IsString()
    @IsOptional()
    neighborhood?: string;

    @ApiPropertyOptional({ example: 'پایگاه شکاری مهرآباد' })
    @IsString()
    @IsOptional()
    suburb?: string;

    @ApiPropertyOptional({ example: 'منطقه ۹' })
    @IsString()
    @IsOptional()
    district?: string;

    // فیلدهای متادیتای OpenStreetMap
    @ApiPropertyOptional({ example: '211082151' })
    @IsString()
    @IsOptional()
    placeId?: string;

    @ApiPropertyOptional({ example: 'relation' })
    @IsString()
    @IsOptional()
    osmType?: string;

    @ApiPropertyOptional({ example: '7787479' })
    @IsString()
    @IsOptional()
    osmId?: string;

    @ApiPropertyOptional({ example: [35.6996124, 35.6997878, 51.3356652, 51.3390767] })
    @IsArray()
    @IsOptional()
    boundingBox?: number[];
}

export class UpdateAddressDto {
    @ApiPropertyOptional({ example: 'Home' })
    @IsString()
    @IsOptional()
    title?: string;

    @ApiPropertyOptional({ example: { lat: 35.6997621, lon: 51.3389295, display_name: "..." } })
    @IsObject()
    @IsOptional()
    fullAddress?: any;

    @ApiPropertyOptional({ example: 'Tehran' })
    @IsString()
    @IsOptional()
    city?: string;

    @ApiPropertyOptional({ example: 'Tehran' })
    @IsString()
    @IsOptional()
    province?: string;

    @ApiPropertyOptional({ example: 'Ali Mohammadi' })
    @IsString()
    @IsOptional()
    receiver?: string;

    @ApiPropertyOptional({ example: '09123456789' })
    @IsString()
    @IsOptional()
    phone?: string;

    @ApiPropertyOptional({ example: '1234567890' })
    @IsString()
    @IsOptional()
    postalCode?: string;

    @IsString()
    @IsOptional()
    plaque?: string;

    @IsString()
    @IsOptional()
    unit?: string;

    @ApiPropertyOptional({ default: false })
    @IsBoolean()
    @IsOptional()
    isDefault?: boolean;

    @ApiPropertyOptional({ example: { lat: 35.759, lng: 51.412 } })
    @IsObject()
    @IsOptional()
    location?: { lat: number; lng: number };

    @ApiPropertyOptional({ example: 'استاد معین' })
    @IsString()
    @IsOptional()
    neighborhood?: string;

    @ApiPropertyOptional({ example: 'پایگاه شکاری مهرآباد' })
    @IsString()
    @IsOptional()
    suburb?: string;

    @ApiPropertyOptional({ example: 'منطقه ۹' })
    @IsString()
    @IsOptional()
    district?: string;

    @ApiPropertyOptional({ example: '211082151' })
    @IsString()
    @IsOptional()
    placeId?: string;

    @ApiPropertyOptional({ example: 'relation' })
    @IsString()
    @IsOptional()
    osmType?: string;

    @ApiPropertyOptional({ example: '7787479' })
    @IsString()
    @IsOptional()
    osmId?: string;

    @ApiPropertyOptional({ example: [35.6996124, 35.6997878, 51.3356652, 51.3390767] })
    @IsArray()
    @IsOptional()
    boundingBox?: number[];
}