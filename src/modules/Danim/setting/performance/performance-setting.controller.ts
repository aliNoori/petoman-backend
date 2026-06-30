import {Controller, Get, Patch, Body, Req} from '@nestjs/common';
import { PerformanceSettingDto} from "./dto/update-performance-setting.dto";
import {DanimPerformanceSettingService} from "./performance-setting.service";

@Controller({ path: 'danim-settings/performance'})
export class DanimPerformanceSettingController {
    constructor(private readonly performanceService: DanimPerformanceSettingService) {}

    @Get()
    getSettings() {
        return this.performanceService.getAllAsObject();
    }

    @Patch()
    updateSettings(@Body() dto: PerformanceSettingDto) {

        return this.performanceService.updateMany(dto.settings);


    }
}