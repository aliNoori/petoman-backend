import {IsArray, IsOptional, IsString, ValidateNested} from 'class-validator';
import { Type } from 'class-transformer';

export class KeyValueDto {
    @IsString()
    key: string;

    @IsOptional()
    value: any;
}

export class UpdateSettingsDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => KeyValueDto)
    general: KeyValueDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => KeyValueDto)
    seo: KeyValueDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => KeyValueDto)
    api: KeyValueDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => KeyValueDto)
    social: KeyValueDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => KeyValueDto)
    opengraph: KeyValueDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => KeyValueDto)
    advance: KeyValueDto[];
}
