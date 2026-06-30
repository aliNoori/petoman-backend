import {Body, Controller, Get, Post, Put, Delete, Param, Query} from '@nestjs/common';
import {UpdateFaqTypeDto} from "./dto/update-faq-type.dto";
import {CreateFaqTypeDto} from "./dto/create-faq-type.dto";
import {FaqTypeService} from "./faq-type.service";



@Controller('faq-types')
export class FaqTypeController {
    constructor(private readonly service: FaqTypeService) {}

    @Get()
    findAll() {
        return this.service.findAll();
    }

    @Get(':name')
    async findByName(@Param('name') name: string) {
        return this.service.findByName(name);
    }

    @Post()
    create(@Body() dto: CreateFaqTypeDto) {
        return this.service.create(dto);
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() dto: UpdateFaqTypeDto) {
        return this.service.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}