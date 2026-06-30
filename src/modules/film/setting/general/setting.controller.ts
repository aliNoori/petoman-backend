import { Controller, Get, Patch, Body } from '@nestjs/common';
import { FilmSettingService } from './setting.service';
import { UpdateSettingsDto } from './dto/update-setting.dto';

@Controller({ path: 'film/settings' })
export class FilmSettingController {
    constructor(private readonly settingService: FilmSettingService) {}

    @Get()
    async getSettings() {
        return {
            general: await this.settingService.getGeneralAll(),
            seo: await this.settingService.getSeoAll(),
            api: await this.settingService.getApiAll(),
            social: await this.settingService.getSocialAll(),
            opengraph: await this.settingService.getOpengraphAll(),
            advance: await this.settingService.getAdvanceAll(),
        };
    }

    @Patch()
    async updateSettings(@Body() dto: UpdateSettingsDto) {
        return this.settingService.updateAll(dto);
    }
}