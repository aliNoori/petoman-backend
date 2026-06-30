import {Body, Controller, Get, Post, Put, Delete, Param, Query} from '@nestjs/common';
import {TagTypeService} from "./tag-type.service";
import {CreateTagTypeDto} from "./dto/create-tag-type.dto";
import {UpdateTagTypeDto} from "./dto/update-tag-type.dto";


@Controller('tag-types')
export class TagTypeController {
    constructor(private readonly service: TagTypeService) {}

    @Get()
    findAll() {
        return this.service.findAll();
    }

    @Get(':name')
    async findByName(@Param('name') name: string) {
        return this.service.findByName(name);
    }

    @Post()
    create(@Body() dto: CreateTagTypeDto) {
        return this.service.create(dto);
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() dto: UpdateTagTypeDto) {
        return this.service.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}