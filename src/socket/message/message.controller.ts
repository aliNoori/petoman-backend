import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { MessageService } from './message.service';
import { JwtAuthGuard} from "../../shared/auth/guards/jwt-auth.guard";
import {BlacklistGuard} from "../../shared/auth/guards/blacklist.guard";

@Controller('messages')
@UseGuards(JwtAuthGuard,BlacklistGuard) // محافظت از مسیر با توکن
export class MessageController {
    constructor(private readonly messageService: MessageService) {}

    // دریافت پیام‌های یک اتاق مشاوره خاص
    @Get('consultation')
    async getConsultationMessages(@Query('consultationId') consultationId: string) {
        if (!consultationId) {
            return { error: 'consultationId is required' };
        }
        return this.messageService.getConsultationMessages(consultationId);
    }

    // (اختیاری) دریافت پیام‌های خصوصی کاربر
    @Get('private')
    async getPrivateMessages(
        @Request() req,
        @Query('targetUserId') targetUserId: string
    ) {
        const userId = req.user.userId; // شناسه کاربر لاگین شده از توکن

        if (!targetUserId) {
            return { error: 'targetUserId is required' };
        }

        return this.messageService.getPrivateHistory(userId, targetUserId);
    }
}