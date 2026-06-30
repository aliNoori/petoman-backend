import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {JwtAuthGuard} from "../../../auth/guards/jwt-auth.guard";
import {AdminGuard} from "../../../auth/guards/admin-guard";
import {AdminPanelService} from "./panel.service";

@ApiTags('مدیریت پنل اصلی')
@Controller('admin/panel')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminPanelController {
    constructor(private readonly panelService: AdminPanelService) {}

    @Get('stats')
    @ApiOperation({ summary: 'دریافت آمار کلی پنل مدیریت' })
    @ApiResponse({ status: 200, description: 'آمار با موفقیت دریافت شد.' })
    async getStats() {
        return await this.panelService.getStats();
    }
}