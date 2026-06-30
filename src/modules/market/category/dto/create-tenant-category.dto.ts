import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateTenantCategoryDto {
    @ApiProperty({
        example: 'Pet Food',
        description: 'Category title',
    })
    @IsString()
    title: string;

    @IsString()
    slug: string;

    @ApiProperty({
        example: null,
        required: false,
        description: 'Parent category ID',
    })
    @IsOptional()
    @IsUUID()
    parentId?: string;
}