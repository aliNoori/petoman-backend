import { IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAdminSettingDto {
    @ApiProperty({ example: { siteName: 'پت‌ئومن', supportEmail: '...' } })
    @IsObject()
    value: Record<string, any>;
}

export class BulkUpdateAdminSettingsDto {
    @ApiProperty({ example: { general: {}, payment: {} } })
    @IsObject()
    settings: Record<string, any>;
}