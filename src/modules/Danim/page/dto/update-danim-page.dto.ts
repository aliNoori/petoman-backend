import { PartialType } from '@nestjs/mapped-types';
import { CreateDanimPageDto} from "./create-danim-page.dto";
import {
    IsOptional,
    IsBoolean,
    IsDate,
    IsString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {ApiPropertyOptional} from "@nestjs/swagger";

export class UpdateDanimPageDto extends PartialType(CreateDanimPageDto) {

    @ApiPropertyOptional({ type: String, format: 'date-time', description: 'تاریخ انتشار صفحه' })
    @IsOptional()
    @Transform(({ value }) => (value ? new Date(value) : null))
    @IsDate()
    publishDate?: Date;

    @ApiPropertyOptional({ description: 'نمایش در منو', type: Boolean })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    showInMenu?: boolean;

    @ApiPropertyOptional({ description: 'تصویر OG' })
    @IsOptional()
    @IsString()
    ogImage?: string;

    @ApiPropertyOptional({ description: 'تصویر اصلی صفحه' })
    @IsOptional()
    @IsString()
    image?: string;
}
