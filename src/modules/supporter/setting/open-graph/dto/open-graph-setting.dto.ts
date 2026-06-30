import { ArrayMinSize, ValidateNested, IsString, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class OpenGraphSettingItemDto {
    @IsString()
    key: string;

    @IsObject()
    value: Record<string, any>;
}

export class OpenGraphSettingDto {
    @ValidateNested({ each: true })
    @ArrayMinSize(1)
    @Type(() => OpenGraphSettingItemDto)
    settings: OpenGraphSettingItemDto[];
}
