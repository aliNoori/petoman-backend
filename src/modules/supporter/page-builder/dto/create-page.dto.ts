import {
    IsString,
    IsOptional,
    IsEnum,
    IsBoolean,
    MaxLength,
    IsNotEmpty,
} from 'class-validator';
import { PageStatus } from '../page.entity';
import {Transform} from "class-transformer";

export class CreatePageDto {
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
    @Transform(({ value }) => value === 'true' || value === true) // ⚡ تبدیل string به boolean
    @IsBoolean()
    showInMenu?: boolean;

    @IsOptional()
    @IsString()
    featuredImage?: string;
}