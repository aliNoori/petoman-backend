import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {AdminFaqsService} from "./admin-faqs.service";
import {AdminGuard} from "../auth/guards/admin-guard";
import {CreateAdminFaqCategoryDto} from "./dtos/create-admin-faqs-category.dto";
import {CreateAdminFaqDto} from "./dtos/create-admin-faqs.dto";
import {UpdateAdminFaqDto} from "./dtos/update-admin-faqs.dto";

@ApiTags('Admin FAQs')
@Controller('admin/faqs')
@UseGuards(JwtAuthGuard,AdminGuard)
@ApiBearerAuth()
export class AdminFaqsController {
    constructor(private readonly faqsService: AdminFaqsService) {}

    // Categories
    @Get('categories')
    getCategories(@Query('section') section: string) {
        return this.faqsService.getCategories(section);
    }

    @Post('categories')
    createCategory(@Body() dto: CreateAdminFaqCategoryDto) {
        return this.faqsService.createCategory(dto);
    }

    @Put('categories/:id')
    updateCategory(@Param('id') id: string, @Body() dto: Partial<CreateAdminFaqCategoryDto>) {
        return this.faqsService.updateCategory(id, dto);
    }

    @Delete('categories/:id')
    deleteCategory(@Param('id') id: string) {
        return this.faqsService.deleteCategory(id);
    }

    // FAQs
    @Get()
    findAll(@Query('section') section?: string, @Query('categoryId') categoryId?: string) {
        return this.faqsService.findAll(section, categoryId ? categoryId : undefined);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.faqsService.findOne(id);
    }

    @Post()
    create(@Body() dto: CreateAdminFaqDto) {
        return this.faqsService.create(dto);
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() dto: UpdateAdminFaqDto) {
        return this.faqsService.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.faqsService.remove(id);
    }
}