import { Controller, Get, Patch, Body } from '@nestjs/common';
import {DanimHomePageSettingService} from "./home-page.service";
import { HomePageSettingDto} from "./dto/home-page-setting.dto";

@Controller({ path: 'danim-settings/page-sections'})
export class DanimHomePageSettingController {
    constructor(private readonly generalService: DanimHomePageSettingService) {}

    @Get()
    getSettings() {
        return this.generalService.getAllAsObject();
    }

    @Patch()
    updateSettings(@Body() dto: HomePageSettingDto) {
        return this.generalService.updateMany(dto.settings);
    }
}
