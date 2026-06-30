import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    UseGuards,
    Request,
    BadRequestException, Query
} from '@nestjs/common';
import { TicketsService } from "./ticket.service";
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { ReplyTicketDto } from './dto/reply-ticket.dto'; // فرض بر اینکه این DTO را می‌سازید
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {BlacklistGuard} from "../auth/guards/blacklist.guard";

@Controller('tickets')
@UseGuards(JwtAuthGuard,BlacklistGuard)
export class TicketsController {
    constructor(private readonly ticketsService: TicketsService) {}

    /**
     * ایجاد تیکت جدید
     */
    @Post()
    async create(
        @Request() req,
        @Body() createTicketDto: CreateTicketDto,
    ) {
        // پیشنهاد: مطمئن شوید که userId در JWT استراتژی به درستی پر شده است
        const userId = req.user?.id;
        if (!userId) throw new BadRequestException('User ID not found in token');

        return this.ticketsService.create(userId, createTicketDto);
    }

    /**
     * دریافت لیست تیکت‌ها
     * اگر ادمین بود همه را ببین، اگر کاربر بود فقط تیکت‌های خودش
     */
    @Get()
    async findAll(@Request() req,@Query('tenantId') tenantId?:string) {
        const userId = req.user?.id;
        const userRoles = req.user?.roles; // بسته به ساختار JWT شما

        return this.ticketsService.findAll(userRoles, userId,tenantId);
    }

    /**
     * دریافت جزئیات یک تیکت (شامل پیام‌ها)
     */
    @Get(':id')
    async findOne(@Param('id') id: string, @Request() req) {
        const userId = req.user?.id;
        const userRole = req.user?.role?.name || req.user?.role;

        return this.ticketsService.findOne(id, userId, userRole);
    }

    /**
     * ارسال پاسخ به تیکت (مخصوص چت)
     * این متد برای اضافه کردن پیام جدید به مکالمه استفاده می‌شود
     */
    @Post(':id/reply')
    async reply(
        @Param('id') id: string,
        @Body() replyTicketDto: ReplyTicketDto,
        @Request() req
    ) {
        const userId = req.user?.id;
        const userRole = req.user?.role?.name;

        return this.ticketsService.reply(id, userId, userRole, replyTicketDto);
    }

    /**
     * تغییر وضعیت یا اطلاعات کلی تیکت
     */
    @Patch(':id')
    async update(
        @Param('id') id: string,
        @Body() updateTicketDto: UpdateTicketDto,
        @Request() req
    ) {
        const userId = req.user?.id;
        const userRole = req.user?.role?.name || req.user?.role;

        return this.ticketsService.update(id, updateTicketDto, userId, userRole);
    }
}