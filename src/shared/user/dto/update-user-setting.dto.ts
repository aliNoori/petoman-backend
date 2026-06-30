import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsOptional } from 'class-validator'

export class UpdateUserSettingDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    newFilmsNotification?: boolean

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    commentsNotification?: boolean

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    publicProfile?: boolean

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    showFavorites?: boolean
}