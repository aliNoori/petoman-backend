import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAdminFaqCategoryDto {
    @ApiProperty({ example: 'market' })
    @IsString()
    section: string;

    @ApiProperty({ example: 'products' })
    @IsString()
    key: string;

    @ApiProperty({ example: 'محصولات' })
    @IsString()
    label: string;

    @ApiProperty({ example: 'ti ti-package', required: false })
    @IsString()
    @IsOptional()
    icon?: string;

    @ApiProperty({ example: '#f97316', required: false })
    @IsString()
    @IsOptional()
    color?: string;
}