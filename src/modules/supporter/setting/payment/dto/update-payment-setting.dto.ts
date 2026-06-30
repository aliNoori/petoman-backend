import {
    ArrayMinSize,
    ValidateNested,
    IsString,
    IsNotEmpty,
    IsDefined,
    IsObject,
    IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PaymentSettingItemDto {
    @IsString()
    @IsNotEmpty()
    key: string;

    @IsDefined()
    value: any; // می‌تواند string, number, boolean یا object باشد
}

export class PaymentSettingDto {
    @ValidateNested({ each: true })
    @ArrayMinSize(1)
    @Type(() => PaymentSettingItemDto)
    settings: PaymentSettingItemDto[];
}