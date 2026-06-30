import { Type } from 'class-transformer';
import { ValidateNested, ArrayMinSize } from 'class-validator';
import { SettingDto} from "./general-setting.dto";

export class UpdateSettingsDto {
    @ValidateNested({ each: true })
    @ArrayMinSize(1)
    @Type(() => SettingDto)
    settings: SettingDto[];
}
