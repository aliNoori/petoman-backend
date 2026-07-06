import {Body, Controller, Get, Post, Put, Delete, Param, Query} from '@nestjs/common';
import { CategoryTypeService } from './category-type.service';
import { CreateCategoryTypeDto} from "./dto/create-category-type.dto";
import { UpdateCategoryTypeDto} from "./dto/update-category-type.dto";

@Controller('category-types')
export class CategoryTypeController {
    constructor(private readonly service: CategoryTypeService) {}

    @Get()
    async findAll() {
        return await this.service.findAll();
    }

    @Get(':name')
    async findByName(@Param('name') name: string) {
        return await this.service.findByName(name);
    }

    @Post()
    async create(@Body() dto: CreateCategoryTypeDto) {
        return await this.service.create(dto);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateCategoryTypeDto) {
        return await this.service.update(id, dto);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return await this.service.remove(id);
    }
}