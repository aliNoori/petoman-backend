import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    ParseUUIDPipe, Req, UseGuards, Logger, ForbiddenException,
} from '@nestjs/common';
import { RequestSupporterService } from './request-supporter.service';
import {ApiTags} from "@nestjs/swagger";
import {CreateRequestSupporterDto} from "./dto/create-request-supporter.dto";
import {JwtAuthGuard} from "../../../shared/auth/guards/jwt-auth.guard";
import {ResourceGuard} from "../../../shared/auth/guards/resource.guard";
import {ACL} from "../../../shared/auth/guards/acl.decorator";


@ApiTags('Request-supporters')
@Controller({ path: 'request-supporters', version: '1' })

export class RequestSupporterController {

    constructor(
        private readonly service: RequestSupporterService) {}

    @Post()
    create(@Body() dto: CreateRequestSupporterDto) {
        return this.service.create(dto) // کاربر درخواست می‌دهد
    }

    @Get()
    @UseGuards(JwtAuthGuard,ResourceGuard)
    @ACL('create', 'supporters')
    findAll() {
        return this.service.findAll() // مدیر لیست درخواست‌ها را می‌بیند
    }

    @Patch(':id/approve')
    @UseGuards(JwtAuthGuard,ResourceGuard)
    @ACL('create', 'supporters')
    async approve(@Param('id') id: string) {
        return this.service.approve(id) // مدیر تایید می‌کند
    }

    @Patch(':id/reject')
    @UseGuards(JwtAuthGuard,ResourceGuard)
    @ACL('create', 'supporters')
    async reject(@Param('id') id: string) {
        return this.service.reject(id) // مدیر رد می‌کند
    }
}
