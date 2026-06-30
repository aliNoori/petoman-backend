import { ArrayMinSize, ValidateNested, IsString, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class HomePageSettingItemDto {
    @IsString()
    key: string;

    @IsObject()
    value: Record<string, any>;
}

export class HomePageSettingDto {
    @ValidateNested({ each: true })
    @ArrayMinSize(1)
    @Type(() => HomePageSettingItemDto)
    settings: HomePageSettingItemDto[];
}
