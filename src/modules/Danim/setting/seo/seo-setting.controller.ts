import {Controller, Get, Patch, Body, Req} from '@nestjs/common';
import { DanimSeoSettingService } from './seo-setting.service';
import { SeoSettingDto } from './dto/update-seo-setting.dto';

@Controller({ path: 'danim-settings/seo'})
export class DanimSeoSettingController {
    constructor(private readonly seoService: DanimSeoSettingService) {}

    @Get()
    getSettings() {
        return this.seoService.getAllAsObject();
    }

    @Patch()
    updateSettings(@Body() dto: SeoSettingDto) {

        return this.seoService.updateMany(dto.settings);


    }
}