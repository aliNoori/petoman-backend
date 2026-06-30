import {Controller, Get, Patch, Body, Req} from '@nestjs/common';
import { SeoSettingService } from './seo-setting.service';
import { SeoSettingDto } from './dto/update-seo-setting.dto';

@Controller({ path: 'settings/seo'})
export class SeoSettingController {
    constructor(private readonly seoService: SeoSettingService) {}

    @Get()
    getSettings() {
        return this.seoService.getAllAsObject();
    }

    @Patch()
    updateSettings(@Body() dto: SeoSettingDto) {

        return this.seoService.updateMany(dto.settings);


    }
}