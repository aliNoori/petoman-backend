import { Controller, Get, Patch, Body } from '@nestjs/common';
import {OpenGraphSettingService} from "./open-graph-setting.service";
import {OpenGraphSettingDto} from "./dto/open-graph-setting.dto";

@Controller({ path: 'settings/open-graph'})
export class OpenGraphSettingController {
    constructor(private readonly openGraphService: OpenGraphSettingService) {}

    @Get()
    getSettings() {
        return this.openGraphService.getAllAsObject();
    }

    @Patch()
    updateSettings(@Body() dto: OpenGraphSettingDto) {
        return this.openGraphService.updateMany(dto.settings);
    }
}
