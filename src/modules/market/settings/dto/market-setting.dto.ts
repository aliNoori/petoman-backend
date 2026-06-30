import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsObject, IsBoolean } from "class-validator";

// DTO for updating a specific setting
export class UpdateSettingDto {
    @ApiProperty({ example: 'shop_info', description: 'The key of the setting to update' })
    @IsString()
    @IsNotEmpty()
    key: string;

    @ApiProperty({ example: { name: 'My Shop', phone: '0912...' }, description: 'The value object (JSON)' })
    @IsObject()
    value: any;
}

// DTO for bulk updating settings (used in the frontend save)
export class BulkUpdateSettingsDto {
    @ApiPropertyOptional({ description: 'Shop general information' })
    @IsOptional()
    @IsObject()
    shopInfo?: any;

    @ApiPropertyOptional({ description: 'Pharmacy general information' })
    @IsOptional()
    @IsObject()
    pharmacyInfo?: any;

    @ApiPropertyOptional({ description: 'Shipping methods configuration' })
    @IsOptional()
    @IsObject()
    shipping?: any;
}