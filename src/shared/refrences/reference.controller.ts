// src/modules/reference/reference.controller.ts
import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { ReferenceService } from './reference.service';
import { Animal } from './entities/animal.entity';
import { Brand } from './entities/brand.entity';
import { Attribute } from './entities/attribute.entity';
import { CreateAnimalDto } from './dto/create-animal.dto';
import { UpdateAnimalDto } from './dto/update-animal.dto';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { CreateAttributeDto } from './dto/create-attribute.dto';
import { UpdateAttributeDto } from './dto/update-attribute.dto';

@ApiTags('Reference Data')
@Controller('reference')
export class ReferenceController {
    constructor(private readonly referenceService: ReferenceService) {}

    // ---------------- Animals ----------------
    @Get('animals')
    @ApiOperation({ summary: 'Get all animals' })
    async getAnimals(): Promise<Animal[]> {
        return this.referenceService.getAnimals();
    }

    @Post('animals')
    @ApiOperation({ summary: 'Create a new animal' })
    @ApiBody({ type: CreateAnimalDto })
    async createAnimal(@Body() dto: CreateAnimalDto): Promise<Animal> {
        return this.referenceService.createAnimal(dto);
    }

    @Put('animals/:slug')
    @ApiOperation({ summary: 'Update an animal by slug' })
    @ApiParam({ name: 'slug', description: 'Animal slug (e.g. dog)' })
    @ApiBody({ type: UpdateAnimalDto })
    async updateAnimal(@Param('slug') slug: string, @Body() dto: UpdateAnimalDto): Promise<Animal> {
        return this.referenceService.updateAnimal(slug, dto);
    }

    @Delete('animals/:slug')
    @ApiOperation({ summary: 'Delete an animal by slug' })
    @ApiParam({ name: 'slug', description: 'Animal slug (e.g. dog)' })
    async deleteAnimal(@Param('slug') slug: string): Promise<void> {
        return this.referenceService.deleteAnimal(slug);
    }

    // ---------------- Brands ----------------

    @Get('brands')
    @ApiOperation({ summary: 'Get all brands' })
    async getBrands(): Promise<Brand[]> {
        return this.referenceService.getBrands();
    }

    @Get('brands/:animalSlug')
    @ApiOperation({ summary: 'Get brands by animal slug' })
    @ApiParam({ name: 'animalSlug', description: 'Animal slug (e.g. dog, cat)' })
    async getBrandsBySlug(@Param('animalSlug') animalSlug: string): Promise<Brand[]> {
        return this.referenceService.getBrandsBySlug(animalSlug);
    }

    @Post('brands')
    @ApiOperation({ summary: 'Create a new brand' })
    @ApiBody({ type: CreateBrandDto })
    async createBrand(@Body() dto: CreateBrandDto): Promise<Brand> {
        return this.referenceService.createBrand(dto);
    }

    @Put('brands/:slug')
    @ApiOperation({ summary: 'Update a brand by slug' })
    @ApiParam({ name: 'slug', description: 'Brand slug (e.g. royal-canin)' })
    @ApiBody({ type: UpdateBrandDto })
    async updateBrand(@Param('slug') slug: string, @Body() dto: UpdateBrandDto): Promise<Brand> {
        return this.referenceService.updateBrand(slug, dto);
    }

    @Delete('brands/:slug')
    @ApiOperation({ summary: 'Delete a brand by slug' })
    @ApiParam({ name: 'slug', description: 'Brand slug (e.g. royal-canin)' })
    async deleteBrand(@Param('slug') slug: string): Promise<void> {
        return this.referenceService.deleteBrand(slug);
    }

    // ---------------- Attributes ----------------
    @Get('attributes')
    @ApiOperation({ summary: 'Get all attributes' })
    async getAttributes(): Promise<Attribute[]> {
        return this.referenceService.getAttributes();
    }
    @Get('attributes/:animalSlug')
    @ApiOperation({ summary: 'Get attributes by animal slug' })
    @ApiParam({ name: 'animalSlug', description: 'Animal slug (e.g. dog, cat)' })
    async getAttributesBySlug(@Param('animalSlug') animalSlug: string): Promise<Attribute[]> {
        return this.referenceService.getAttributesBySlug(animalSlug);
    }

    @Post('attributes')
    @ApiOperation({ summary: 'Create a new attribute' })
    @ApiBody({ type: CreateAttributeDto })
    async createAttribute(@Body() dto: CreateAttributeDto): Promise<Attribute> {
        return this.referenceService.createAttribute(dto);
    }

    @Put('attributes/:slug')
    @ApiOperation({ summary: 'Update an attribute by slug' })
    @ApiParam({ name: 'slug', description: 'Attribute slug (e.g. chicken)' })
    @ApiBody({ type: UpdateAttributeDto })
    async updateAttribute(@Param('slug') slug: string, @Body() dto: UpdateAttributeDto): Promise<Attribute> {
        return this.referenceService.updateAttribute(slug, dto);
    }

    @Delete('attributes/:slug')
    @ApiOperation({ summary: 'Delete an attribute by slug' })
    @ApiParam({ name: 'slug', description: 'Attribute slug (e.g. chicken)' })
    async deleteAttribute(@Param('slug') slug: string): Promise<void> {
        return this.referenceService.deleteAttribute(slug);
    }
}