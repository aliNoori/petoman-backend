import { Controller, Get, Patch, Body } from '@nestjs/common';
import {DanimGeneralSettingService} from './general-setting.service';
import { UpdateSettingsDto} from "./dto/update-general-setting.dto";

@Controller({ path: 'danim-settings/general'})
export class DanimGeneralSettingController {
    constructor(private readonly generalService: DanimGeneralSettingService) {}

    @Get()
    getSettings() {
        return this.generalService.getAllAsObject();
    }

    @Patch()
    updateSettings(@Body() dto: UpdateSettingsDto) {
        return this.generalService.updateMany(dto.settings);
    }
}
