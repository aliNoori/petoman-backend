// src/consultations/consultations.controller.ts
import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { ConsultationsService} from "./consultations.service";
import { CreateConsultationDto} from "./create-consultation.dto";
import { UpdateConsultationDto} from "./update-consultation.dto";
import { JwtAuthGuard} from "../../shared/auth/guards/jwt-auth.guard";
import {BlacklistGuard} from "../../shared/auth/guards/blacklist.guard";

@Controller('consultations')
@UseGuards(JwtAuthGuard,BlacklistGuard) // تمامی روت‌ها نیاز به لاگین دارند
export class ConsultationsController {
    constructor(private readonly consultationsService: ConsultationsService) {}

    // ایجاد مشاوره (بعد از پرداخت)
    @Post()
    create(@Request() req, @Body() createConsultationDto: CreateConsultationDto) {
        // req.user شامل اطلاعات کاربر از JWT است (فرض بر این است که payload شامل id است)
        return this.consultationsService.create(req.user.id, createConsultationDto);
    }

    // لیست مشاوره‌های من (کاربر)
    @Get('my-list')
    findMyConsultations(@Request() req) {
        return this.consultationsService.findAllForUser(req.user.id);
    }

    // لیست مشاوره‌های دکتر (اگر دکتر لاگین است)
    @Get('doctor-list')
    findDoctorConsultations(@Request() req) {
        // فرض بر این است که در JWT چک شده که کاربر دکتر است یا نقشش را چک می‌کنید
        return this.consultationsService.findAllForDoctor(req.user.id);
    }

    // دریافت جزئیات یک مشاوره
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.consultationsService.findOne(id);
    }

    // تایید مشاوره (توسط دکتر)
    @Patch(':id/approve')
    approve(@Param('id') id: string, @Request() req) {
        return this.consultationsService.approve(id, req.user.id);
    }

    // بستن مشاوره
    @Patch(':id/close')
    close(@Param('id') id: string, @Request() req) {
        return this.consultationsService.close(id);
    }
}