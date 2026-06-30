// file: faq.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {Faq} from "./faq.entity";
import {CreateFaqDto} from "./dto/create-faq.dto";
import {FaqType} from "./faq-type.entity";
import {Category} from "../category/category.entity";
import {UpdateFaqDto} from "./dto/update-faq.dto";


@Injectable()
export class FaqService {
    constructor(
        @InjectRepository(Faq)
        private faqRepository: Repository<Faq>,
    ) {}


    async findAllFlat(filters?: { typeId?: string; activeOnly?: boolean }) {
        const qb = this.faqRepository.createQueryBuilder('c')
            .leftJoinAndSelect('c.type', 'type')
            .leftJoinAndSelect('c.category', 'category'); // اضافه کردن ریلیشن دسته‌بندی

        if (filters?.typeId) {
            qb.andWhere('c.typeId = :typeId', { typeId: filters.typeId });
        }

        if (filters?.activeOnly) {
            qb.andWhere('c.isActive = :isActive', { isActive: true });
        }

        return qb.getMany();
    }



    findOne(id: string) {
        return this.faqRepository.findOne({ where: { id } });
    }


    async create(dto: CreateFaqDto) {

        let typeEntity: FaqType | null = null;
        if (dto.typeId) {
            typeEntity = await this.faqRepository.manager.findOne(FaqType, { where: { id: dto.typeId } as any });
            if (!typeEntity) throw new NotFoundException('نوع تگ یافت نشد');
        }

        const category = await this.faqRepository.manager.findOne(Category, { where: { id: dto.categoryId } });

        if (!category) throw new NotFoundException('دسته‌بندی پیدا نشد');

        const faq = this.faqRepository.create({
            order:dto.order,
            question:dto.question,
            answer:dto.answer,
            contentType:dto.contentType,
            contentTitle:dto.contentTitle,
            color: dto.color,
            status:dto.status,
            isActive: dto.isActive ?? true,
            type: typeEntity ?? undefined,
            category,
        });

        return this.faqRepository.save(faq);
    }


    async update(id: string, dto: UpdateFaqDto) {
        const faq = await this.faqRepository.findOne({ where: { id } });
        if (!faq) throw new NotFoundException('faq not found');

        // اگر typeId داده شده باشه، موجودیت مربوطه رو پیدا کن
        let typeEntity: FaqType | null = null;
        if (dto.typeId) {
            typeEntity = await this.faqRepository.manager.findOne(FaqType, { where: { id: dto.typeId } as any });
            if (!typeEntity) throw new NotFoundException('نوع تگ یافت نشد');
        }

        if (dto.categoryId) {
            const category = await this.faqRepository.manager.findOne(Category, {
                where: { id: dto.categoryId }
            });

            if (!category) throw new NotFoundException('دسته‌بندی پیدا نشد');

            faq.category = category;
        }

        faq.question = dto.question ?? faq.question;
        faq.contentType = dto.contentType ?? faq.contentType;
        faq.contentTitle=dto.contentTitle??faq.contentTitle;
        faq.color = dto.color ?? faq.color;
        faq.isActive = dto.isActive ?? faq.isActive;
        faq.status=dto.status??faq.status;
        faq.type = typeEntity ?? faq.type;
        faq.order=dto.order??faq.order;

        return this.faqRepository.save(faq);
    }

    async remove(id: string) {
        const faq = await this.faqRepository.findOne({ where: { id } });
        if (!faq) throw new NotFoundException('faq not found');
        return this.faqRepository.remove(faq);
    }

    async toggleStatus(id: string, isActive: boolean) {
        const faq = await this.faqRepository.findOne({ where: { id } });

        if (!faq) {
            throw new NotFoundException("FAQ not found");
        }

        faq.isActive = isActive;

        return this.faqRepository.save(faq);
    }
}