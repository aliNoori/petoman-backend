import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';

import { CreateActivityLogDto} from "./create-activity-log.dto";
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {ActivitiesLogService} from "./activities-log.service";
import {BlacklistGuard} from "../auth/guards/blacklist.guard"; // مسیر گارد احتمالی شما

@Controller('activities')
@UseGuards(JwtAuthGuard,BlacklistGuard) // محافظت از تمام روت‌ها با احراز هویت
export class ActivitiesLogController {
    constructor(private readonly activitiesService:ActivitiesLogService) {}

    // ثبت لاگ جدید (دستی)
    @Post()
    create(@Body() createActivityLogDto: CreateActivityLogDto) {
        return this.activitiesService.createLog(createActivityLogDto);
    }

    // دریافت لیست فعالیت‌ها (برای داشبورد فرانت‌اند)
    @Get()
    findAll(@Query('limit') limit: string) {
        const limitNumber = limit ? parseInt(limit) : 20;
        return this.activitiesService.findAll(limitNumber);
    }
}