// file: faq.controller.ts
import {Controller, Get, Post, Body, Param, Patch, Delete, Query, UseGuards, ParseUUIDPipe} from '@nestjs/common';
import {FaqService} from "./faq.service";
import {CreateFaqDto} from "./dto/create-faq.dto";
import {UpdateFaqDto} from "./dto/update-faq.dto";
import {ApiTags} from "@nestjs/swagger";
import {JwtAuthGuard} from "../auth/guards/jwt-auth.guard";
import {ResourceGuard} from "../auth/guards/resource.guard";
import {ACL} from "../auth/guards/acl.decorator";

@ApiTags('faqs')
//@UseGuards(JwtAuthGuard,ResourceGuard)
//@ACL('create','supporters')
@Controller('faqs')
export class FaqController {
    constructor(private readonly faqService: FaqService) {}


    @Get()
    findAll(@Query('typeId') type?: string, @Query('active') active?: string) {
        const filters = { typeId: type as any, activeOnly: active === '1' };
        return this.faqService.findAllFlat(filters);
    }


    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.faqService.findOne(id);
    }


    @Post()
    create(@Body() dto: CreateFaqDto) {
        return this.faqService.create(dto);
    }


    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateFaqDto) {
        return this.faqService.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.faqService.remove(id);
    }

    @Patch(':id/status')
    toggleStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() body: { isActive: boolean }
    ) {
        return this.faqService.toggleStatus(id, body.isActive)
    }
}