import { Controller, Get, Patch, Body } from '@nestjs/common';
import { GeneralSettingService } from './general-setting.service';
import { UpdateSettingsDto} from "./dto/update-general-setting.dto";

@Controller({ path: 'settings/general'})
export class GeneralSettingController {
    constructor(private readonly generalService: GeneralSettingService) {}

    @Get()
    getSettings() {
        return this.generalService.getAllAsObject();
    }

    @Patch()
    updateSettings(@Body() dto: UpdateSettingsDto) {
        return this.generalService.updateMany(dto.settings);
    }
}
