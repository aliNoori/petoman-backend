import { IsOptional, IsString } from 'class-validator';

export class UpdateAppearanceSettingDto {
    @IsOptional()
    @IsString()
    metaThemeColor?: string;

    @IsOptional()
    @IsString()
    metaThemeColorDark?: string;
}
