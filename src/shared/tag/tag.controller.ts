// file: tag.controller.ts
import {Controller, Get, Post, Body, Param, Patch, Delete, Query, UseGuards} from '@nestjs/common';
import { TagService } from './tag.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import {ApiTags} from "@nestjs/swagger";
import {JwtAuthGuard} from "../auth/guards/jwt-auth.guard";
import {ResourceGuard} from "../auth/guards/resource.guard";
import {ACL} from "../auth/guards/acl.decorator";

@ApiTags('tags')
@UseGuards(JwtAuthGuard/*,ResourceGuard*/)
//@ACL('create', 'danim_pages')
@Controller('tags')
export class TagController {
    constructor(private readonly tagService: TagService) {}


    @Get()
    findAll(@Query('typeId') type?: string,@Query('contentType') contentType?: string, @Query('active') active?: string) {
        const filters = { typeId: type as any,contentType:contentType, activeOnly: active === '1' };
        return this.tagService.findAllFlat(filters);
    }


    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.tagService.findOne(id);
    }


    @Post()
    create(@Body() dto: CreateTagDto) {
        return this.tagService.create(dto);
    }


    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateTagDto) {
        return this.tagService.update(id, dto);
    }
    @Patch(':id/increment')
    incrementCount(@Param('id') id: string) {
        return this.tagService.incrementCount(id);
    }
    @Patch(':id/decrement')
    decrementCount(@Param('id') id: string) {
        return this.tagService.decrementCount(id);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.tagService.remove(id);
    }
}