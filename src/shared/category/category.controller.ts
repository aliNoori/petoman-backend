// src/modules/category/category.controller.ts
import { Controller, Get, Post, Body, Param, Patch, Delete, Query } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
export class CategoryController {
    constructor(private readonly svc: CategoryService) {}

    @Post()
    create(@Body() dto: CreateCategoryDto) { return this.svc.create(dto); }

    @Get()
    findAll(@Query('typeId') type?: string,
            @Query('contentType') contentType?: string, @Query('activeOnly') active?: string) {
        const filters = { typeId: type as any,contentType:contentType, activeOnly: active === '1' };
        return this.svc.findAllFlat(filters);
    }

    @Get('tree')
    tree(@Query('typeId') type?: string,@Query('contentType') contentType?: string) {
        return this.svc.findTreeByType(type as any,contentType);
    }

    @Get(':id/ancestors')
    ancestors(@Param('id') id: string) { return this.svc.findAncestors(id); }

    @Get(':id/descendants')
    descendants(@Param('id') id: string) { return this.svc.findDescendants(id); }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) { return this.svc.update(id, dto); }

    @Patch(':id/move')
    move(@Param('id') id: string, @Body() body: { parentId?: string | null, sortOrder?: number }) {
        return this.svc.move(id, body.parentId ?? null, body.sortOrder);
    }

    @Delete(':id')
    softDelete(@Param('id') id: string) { return this.svc.softDelete(id); }

    @Post(':id/restore')
    restore(@Param('id') id: string) { return this.svc.restore(id); }

    @Delete(':id/hard')
    hard(@Param('id') id: string) { return this.svc.removeHard(id); }

    @Patch(':id/status')
    toggleStatus(
        @Param('id') id: string,
        @Body() body: { isActive: boolean }
    ) {
        return this.svc.toggleStatus(id, body.isActive);
    }

}