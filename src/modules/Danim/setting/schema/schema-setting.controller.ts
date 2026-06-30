import {Controller, Get, Patch, Body, Req} from '@nestjs/common';
import { DanimSchemaSettingService } from './schema-setting.service';
import { SchemaSettingDto} from "./dto/update-schema-setting.dto";

@Controller({ path: 'danim-settings/schema'})
export class DanimSchemaSettingController {
    constructor(private readonly schemaService: DanimSchemaSettingService) {}

    @Get()
    getSettings() {
        return this.schemaService.getAllAsObject();
    }

    @Patch()
    updateSettings(@Body() dto: SchemaSettingDto) {
        return this.schemaService.updateMany(dto.settings);
    }
}
