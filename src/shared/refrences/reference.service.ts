import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Animal } from './entities/animal.entity';
import { Brand } from './entities/brand.entity';
import { Attribute } from './entities/attribute.entity';
import { CreateAnimalDto } from './dto/create-animal.dto';
import { UpdateAnimalDto } from './dto/update-animal.dto';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { CreateAttributeDto } from './dto/create-attribute.dto';
import { UpdateAttributeDto } from './dto/update-attribute.dto';

@Injectable()
export class ReferenceService {
    constructor(
        @InjectRepository(Animal) private animalRepo: Repository<Animal>,
        @InjectRepository(Brand) private brandRepo: Repository<Brand>,
        @InjectRepository(Attribute) private attributeRepo: Repository<Attribute>,
    ) {}

    // ---------------- Animals ----------------

    /**
     * Retrieve all animals with their associated brands and attributes
     */
    async getAnimals(): Promise<Animal[]> {
        return this.animalRepo.find({
            relations: ['brands', 'attributes']
        });
    }

    /**
     * Create a new animal
     */
    async createAnimal(dto: CreateAnimalDto): Promise<Animal> {
        const animal = this.animalRepo.create(dto);
        return this.animalRepo.save(animal);
    }

    /**
     * Update an existing animal by slug
     */
    async updateAnimal(slug: string, dto: UpdateAnimalDto): Promise<Animal> {
        const animal = await this.animalRepo.findOne({ where: { slug } });
        if (!animal) throw new NotFoundException('Animal not found');
        Object.assign(animal, dto);
        return this.animalRepo.save(animal);
    }

    /**
     * Delete an animal by slug
     */
    async deleteAnimal(slug: string): Promise<void> {
        const animal = await this.animalRepo.findOne({ where: { slug } });
        if (!animal) throw new NotFoundException('Animal not found');
        await this.animalRepo.remove(animal);
    }

    // ---------------- Brands ----------------

    /**
     * Retrieve all brands with their associated animals
     */
    async getBrands(): Promise<Brand[]> {
        return this.brandRepo.find({
            relations: ['animals']
        });
    }

    /**
     * Retrieve brands associated with a specific animal slug
     */
    async getBrandsBySlug(animalSlug: string): Promise<Brand[]> {
        const animal = await this.animalRepo.findOne({
            where: { slug: animalSlug },
            relations: ['brands']
        });

        if (!animal) throw new NotFoundException('Animal not found');

        return animal.brands;
    }

    /**
     * Create a new brand and link it to an animal
     */
    async createBrand(dto: CreateBrandDto): Promise<Brand> {
        const animal = await this.animalRepo.findOne({ where: { slug: dto.animalSlug } });
        if (!animal) throw new NotFoundException('Animal not found');

        // Create brand and establish Many-to-Many relation
        const brand = this.brandRepo.create({
            slug: dto.slug,
            name: dto.name,
            code: dto.code,
            animals: [animal] // Link to the animal
        });

        return this.brandRepo.save(brand);
    }

    /**
     * Update an existing brand
     */
    async updateBrand(slug: string, dto: UpdateBrandDto): Promise<Brand> {
        const brand = await this.brandRepo.findOne({
            where: { slug },
            relations: ['animals'] // Load relations to update them
        });

        if (!brand) throw new NotFoundException('Brand not found');

        // Update simple fields
        brand.slug = dto.slug || brand.slug;
        brand.name = dto.name || brand.name;
        brand.code = dto.code || brand.code;

        // Update relation if animalSlug is provided
        if (dto.animalSlug) {
            const animal = await this.animalRepo.findOne({ where: { slug: dto.animalSlug } });
            if (animal) {
                brand.animals = [animal];
            }
        }

        return this.brandRepo.save(brand);
    }

    /**
     * Delete a brand by slug
     */
    async deleteBrand(slug: string): Promise<void> {
        const brand = await this.brandRepo.findOne({ where: { slug } });
        if (!brand) throw new NotFoundException('Brand not found');
        await this.brandRepo.remove(brand);
    }

    // ---------------- Attributes ----------------

    /**
     * Retrieve all attributes with their associated animals
     */
    async getAttributes(): Promise<Attribute[]> {
        return this.attributeRepo.find({
            relations: ['animals']
        });
    }

    /**
     * Retrieve attributes associated with a specific animal slug
     */
    async getAttributesBySlug(animalSlug: string): Promise<Attribute[]> {
        const animal = await this.animalRepo.findOne({
            where: { slug: animalSlug },
            relations: ['attributes']
        });

        if (!animal) throw new NotFoundException('Animal not found');

        return animal.attributes;
    }

    /**
     * Create a new attribute and link it to an animal
     */
    async createAttribute(dto: CreateAttributeDto): Promise<Attribute> {
        const animal = await this.animalRepo.findOne({ where: { slug: dto.animalSlug } });
        if (!animal) throw new NotFoundException('Animal not found');

        const attribute = this.attributeRepo.create({
            slug: dto.slug,
            name: dto.name,
            type: dto.type,
            animals: [animal] // Link to the animal
        });

        return this.attributeRepo.save(attribute);
    }

    /**
     * Update an existing attribute
     */
    async updateAttribute(slug: string, dto: UpdateAttributeDto): Promise<Attribute> {
        const attribute = await this.attributeRepo.findOne({
            where: { slug },
            relations: ['animals']
        });

        if (!attribute) throw new NotFoundException('Attribute not found');

        attribute.slug = dto.slug || attribute.slug;
        attribute.name = dto.name || attribute.name;
        attribute.type = dto.type || attribute.type;

        if (dto.animalSlug) {
            const animal = await this.animalRepo.findOne({ where: { slug: dto.animalSlug } });
            if (animal) {
                attribute.animals = [animal];
            }
        }

        return this.attributeRepo.save(attribute);
    }

    /**
     * Delete an attribute by slug
     */
    async deleteAttribute(slug: string): Promise<void> {
        const attribute = await this.attributeRepo.findOne({ where: { slug } });
        if (!attribute) throw new NotFoundException('Attribute not found');
        await this.attributeRepo.remove(attribute);
    }
}