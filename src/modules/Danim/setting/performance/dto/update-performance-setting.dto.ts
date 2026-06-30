import {
    ArrayMinSize,
    ValidateNested,
    IsString,
    IsNotEmpty,
    IsDefined,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PerformanceSettingItemDto {
    @IsString()
    @IsNotEmpty()
    key: string;

    /**
     * value می‌تواند string | boolean | number | object باشد
     */
    @IsDefined()
    value: any;
}

export class PerformanceSettingDto {
    @ValidateNested({ each: true })
    @ArrayMinSize(1)
    @Type(() => PerformanceSettingItemDto)
    settings: PerformanceSettingItemDto[];
}
