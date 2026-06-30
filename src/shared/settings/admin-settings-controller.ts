import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminSettingsService} from "./admin-settings-service";
import { BulkUpdateAdminSettingsDto} from "./update-admin-settings.dto";
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {AdminGuard} from "../auth/guards/admin-guard"; // فرض بر وجود گارد احراز هویت

@ApiTags('Admin Settings')
@Controller('admin/settings')
@UseGuards(JwtAuthGuard,AdminGuard)
@ApiBearerAuth()
export class AdminSettingsController {
    constructor(private readonly settingsService: AdminSettingsService) {}

    @Get()
    async getAllSettings() {
        return await this.settingsService.findAll();
    }

    @Put()
    async updateSettings(@Body() updateSettingDto: BulkUpdateAdminSettingsDto) {
        await this.settingsService.updateBulk(updateSettingDto);
        return { message: 'تنظیمات با موفقیت ذخیره شد' };
    }
}