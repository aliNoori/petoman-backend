import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// تعریف کلاس برای آیتم‌های داخل آرایه permissions
export class PermissionItemDto {
    @ApiProperty({ example: 'content.view' })
    @IsString()
    @IsNotEmpty()
    key: string;

    @ApiProperty({ example: 'مشاهده محتوا' })
    @IsString()
    @IsNotEmpty()
    label: string;
}

export class CreateRoleDto {
    @ApiProperty({ example: 'مدیر فروش' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    name: string;

    @ApiPropertyOptional({ example: 'دسترسی به بخش فروش و گزارشات' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ example: 'ti ti-shopping-cart', default: 'ti ti-shield' })
    @IsOptional()
    @IsString()
    icon?: string;

    @ApiPropertyOptional({ example: '#3b82f6', default: '#8b5cf6' })
    @IsOptional()
    @IsString()
    color?: string;

    @ApiPropertyOptional({ type: [PermissionItemDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PermissionItemDto)
    permissions?: PermissionItemDto[];
}