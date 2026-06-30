import { Controller, Get, Patch, Body } from '@nestjs/common';
import {DanimOpenGraphSettingService} from "./open-graph-setting.service";
import {OpenGraphSettingDto} from "./dto/open-graph-setting.dto";

@Controller({ path: 'danim-settings/opengraph'})
export class DanimOpenGraphSettingController {
    constructor(private readonly openGraphService: DanimOpenGraphSettingService) {}

    @Get()
    getSettings() {
        return this.openGraphService.getAllAsObject();
    }
    @Patch()
    updateSettings(@Body() dto: OpenGraphSettingDto) {
        return this.openGraphService.updateMany(dto.settings);
    }
}
