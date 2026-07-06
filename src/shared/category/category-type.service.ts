import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoryTypeEntity } from './category-type.entity';
import {UpdateCategoryTypeDto} from "./dto/update-category-type.dto";
import {CreateCategoryTypeDto} from "./dto/create-category-type.dto";

@Injectable()
export class CategoryTypeService {
    constructor(
        @InjectRepository(CategoryTypeEntity)
        private readonly repo: Repository<CategoryTypeEntity>,
    ) {}

    async create(dto: CreateCategoryTypeDto) {
        const exists = await this.repo.findOne({ where: { name: dto.name } });
        if (exists) throw new Error('این نام قبلاً ثبت شده است');

        const type = this.repo.create({
            ...dto,
            isActive: dto.isActive ?? true,
        });
        return await this.repo.save(type);
    }

    async update(id: string, dto: UpdateCategoryTypeDto) {
        const type = await this.repo.findOne({ where: { id } });
        if (!type) throw new NotFoundException('نوع دسته‌بندی پیدا نشد');

        Object.assign(type, dto);
        return await this.repo.save(type);
    }


    async findAll() {
        return await this.repo.find({ where: { isActive: true } });
    }

    async findByName(name:string) {
        return await this.repo.findOne({ where: { isActive: true, name } });
    }

    async remove(id: string) {
        const type = await this.repo.findOne({ where: { id } });
        if (!type) throw new NotFoundException();
        await this.repo.softDelete(id);
        return { message: 'deleted' };
    }
}