// src/modules/pets/pets.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { PetsService } from './pets.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard} from "../../../shared/auth/guards/jwt-auth.guard";
import {BlacklistGuard} from "../../../shared/auth/guards/blacklist.guard";

@ApiTags('Pets')
@Controller('pets')
@UseGuards(JwtAuthGuard,BlacklistGuard) // محافظت از تمام مسیرها
@ApiBearerAuth()
export class PetsController {
    constructor(private readonly petsService: PetsService) {}

    @Post()
    @ApiOperation({ summary: 'ثبت حیوان جدید' })
    create(@Body() createPetDto: CreatePetDto, @Request() req) {
        // فرض: req.user شامل اطلاعات کاربر لاگین شده است و id دارد
        return this.petsService.create(createPetDto, req.user.id);
    }

    @Get()
    @ApiOperation({ summary: 'لیست حیوانات کاربر' })
    findAll(@Request() req) {
        return this.petsService.findAll(req.user.id);
    }

    @Get(':id')
    @ApiOperation({ summary: 'مشاهده جزئیات یک حیوان' })
    findOne(@Param('id') id: string, @Request() req) {
        return this.petsService.findOne(id, req.user.id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'ویرایش اطلاعات حیوان' })
    update(@Param('id') id: string, @Body() updatePetDto: UpdatePetDto, @Request() req) {
        return this.petsService.update(id, updatePetDto, req.user.id);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'حذف حیوان' })
    remove(@Param('id') id: string, @Request() req) {
        return this.petsService.remove(id, req.user.id);
    }
}