import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {FaqType} from "./faq-type.entity";
import {CreateFaqTypeDto} from "./dto/create-faq-type.dto";
import {UpdateFaqTypeDto} from "./dto/update-faq-type.dto";

@Injectable()
export class FaqTypeService {
    constructor(
        @InjectRepository(FaqType)
        private readonly repo: Repository<FaqType>,
    ) {}

    async create(dto: CreateFaqTypeDto) {
        const exists = await this.repo.findOne({ where: { name: dto.name } });
        if (exists) throw new Error('این نام قبلاً ثبت شده است');

        const type = this.repo.create({
            ...dto,
            isActive: dto.isActive ?? true,
        });
        return this.repo.save(type);
    }

    async update(id: string, dto: UpdateFaqTypeDto) {
        const type = await this.repo.findOne({ where: { id } });
        if (!type) throw new NotFoundException('نوع دسته‌بندی پیدا نشد');

        Object.assign(type, dto);
        return this.repo.save(type);
    }


    async findAll() {
        return this.repo.find({ where: { isActive: true } });
    }

    async findByName(name:string) {
        return this.repo.findOne({ where: { isActive: true, name } });
    }

    async remove(id: string) {
        const type = await this.repo.findOne({ where: { id } });
        if (!type) throw new NotFoundException();
        await this.repo.softDelete(id);
        return { message: 'deleted' };
    }
}