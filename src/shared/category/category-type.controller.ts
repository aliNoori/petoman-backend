import {Body, Controller, Get, Post, Put, Delete, Param, Query} from '@nestjs/common';
import { CategoryTypeService } from './category-type.service';
import { CreateCategoryTypeDto} from "./dto/create-category-type.dto";
import { UpdateCategoryTypeDto} from "./dto/update-category-type.dto";

@Controller('category-types')
export class CategoryTypeController {
    constructor(private readonly service: CategoryTypeService) {}

    @Get()
    findAll() {
        return this.service.findAll();
    }

    @Get(':name')
    async findByName(@Param('name') name: string) {
        return this.service.findByName(name);
    }

    @Post()
    create(@Body() dto: CreateCategoryTypeDto) {
        return this.service.create(dto);
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() dto: UpdateCategoryTypeDto) {
        return this.service.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}