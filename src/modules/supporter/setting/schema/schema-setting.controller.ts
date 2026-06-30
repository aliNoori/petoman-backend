import {Controller, Get, Patch, Body, Req} from '@nestjs/common';
import { SchemaSettingService } from './schema-setting.service';
import { SchemaSettingDto} from "./dto/update-schema-setting.dto";

@Controller({ path: 'settings/schema'})
export class SchemaSettingController {
    constructor(private readonly schemaService: SchemaSettingService) {}

    @Get()
    getSettings() {
        return this.schemaService.getAllAsObject();
    }

    @Patch()
    updateSettings(@Body() dto: SchemaSettingDto) {
        return this.schemaService.updateMany(dto.settings);
    }
}
