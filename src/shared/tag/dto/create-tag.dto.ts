import {IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID} from 'class-validator';
import {ContentType} from "../tag.entity";
import {ApiProperty, ApiPropertyOptional} from "@nestjs/swagger";


export class CreateTagDto {
    @ApiProperty({ example: 'طبیعت', description: 'نام تگ' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'nature', description: 'اسلاگ تگ (برای URL)' })
    @IsString()
    @IsNotEmpty()
    slug: string;

    @ApiPropertyOptional({ example: ContentType.MOVIE, description: 'نوع محتوا', enum: ContentType })
    @IsString()
    @IsOptional()
    contentType?: ContentType;

    @ApiPropertyOptional({ example: true, description: 'آیا تگ فعال است؟' })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({ example: '#FF5733', description: 'رنگ مرتبط با تگ' })
    @IsOptional()
    @IsString()
    color?: string;

    @ApiPropertyOptional({ example: 'این تگ برای دسته‌بندی مستندات طبیعت استفاده می‌شود.', description: 'توضیحات تگ' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'شناسه نوع (UUID)' })
    @IsOptional()
    @IsUUID()
    typeId?: string | null;
}