import {
    ArrayMinSize,
    ValidateNested,
    IsString,
    IsNotEmpty,
    IsDefined, IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SchemaSettingItemDto {
    @IsString()
    @IsNotEmpty()
    key: string;

    @IsObject()
    value: Record<string, any>;
}

export class SchemaSettingDto {
    @ValidateNested({ each: true })
    @ArrayMinSize(1)
    @Type(() => SchemaSettingItemDto)
    settings: SchemaSettingItemDto[];
}
