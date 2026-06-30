import {
    IsString,
    IsEnum,
    IsOptional,
    IsNumber,
    IsUUID,
    IsNotEmpty,
    IsObject,
    ValidateNested,
    IsDefined,
    IsBoolean
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum VetServiceType {
    IN_PERSON = 'in-person',
    HOME = 'home',
    PHONE_INSTANT = 'phone-instant',
    PHONE_SCHEDULED = 'phone-scheduled',
    TEXT = 'text',
}

export enum PaymentMethod {
    ONLINE = 'online',
    WALLET = 'wallet',
}

export class ReservedTimeDto {
    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    date?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    time?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    option?: string;
}

export class SubmitOrderVetClinicDto {
    @ApiProperty({ description: 'شناسه دامپزشک' })
    @IsUUID()
    @IsNotEmpty()
    tenantId: string;

    @ApiPropertyOptional({ description: 'شناسه کلینیک' })
    @IsUUID()
    @IsOptional()
    clinicId?: string;

    @ApiProperty({ description: 'شناسه حیوان' })
    @IsUUID()
    @IsNotEmpty()
    petId: string;

    @ApiProperty({ description: 'نوع سرویس', enum: VetServiceType })
    @IsEnum(VetServiceType)
    @IsNotEmpty()
    serviceType: VetServiceType;

    @ApiPropertyOptional()
    @IsUUID()
    @IsOptional()
    addressId?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    addressDetails?: string;

    @ApiProperty({
        description: 'زمان رزرو شده',
        type: ReservedTimeDto
    })
    @IsObject()
    @ValidateNested()
    @Type(() => ReservedTimeDto)
    @IsDefined() // تضمین می‌کند که این فیلد ارسال شده باشد (ولی می‌تواند خالی باشد)
    reservedTime: ReservedTimeDto;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    phoneCallOption?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    notes?: string;

    @ApiProperty({ description: 'روش پرداخت', enum: PaymentMethod })
    @IsEnum(PaymentMethod)
    @IsNotEmpty()
    paymentMethod: PaymentMethod;

    @ApiProperty({ description: 'مبلغ' })
    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number) // اطمینان از تبدیل رشته به عدد
    amount: number;

    @IsBoolean()
    @IsOptional()
    acceptQueue?: boolean;
}