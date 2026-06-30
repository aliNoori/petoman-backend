import {
    IsString,
    IsOptional,
    IsEnum,
    IsBoolean,
    MaxLength,
    IsNotEmpty, IsDate,
} from 'class-validator';
import { PageStatus } from '../page.entity';
import {Transform} from "class-transformer";

export class CreateFilmPageDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    title: string;

    @IsString()
    @IsOptional()
    @MaxLength(100)
    slug?: string;

    @IsString()
    @IsNotEmpty()
    content: string;

    @IsOptional()
    @IsString()
    @MaxLength(70)
    metaTitle?: string;

    @IsOptional()
    @IsString()
    @MaxLength(170)
    metaDescription?: string;

    @IsEnum(PageStatus)
    status: PageStatus;


    @IsOptional()
    @IsString()
    thumbnailUrl?: string;

    @IsOptional()
    @Transform(({ value }) => (value ? new Date(value) : null))
    @IsDate()
    publishDate?: Date;

    @IsOptional()
    @IsString()
    template?: string;
}