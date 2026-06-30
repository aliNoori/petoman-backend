import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {AdminFaq} from "./entities/admin-faqs.entity";
import {AdminFaqCategory} from "./entities/admin-faqs-category.entity";
import {CreateAdminFaqCategoryDto} from "./dtos/create-admin-faqs-category.dto";
import {UpdateAdminFaqDto} from "./dtos/update-admin-faqs.dto";
import {CreateAdminFaqDto} from "./dtos/create-admin-faqs.dto";

@Injectable()
export class AdminFaqsService {
    constructor(
        @InjectRepository(AdminFaq)
        private readonly faqRepository: Repository<AdminFaq>,
        @InjectRepository(AdminFaqCategory)
        private readonly categoryRepository: Repository<AdminFaqCategory>,
    ) {}

    // --- Categories ---
    async getCategories(section: string): Promise<AdminFaqCategory[]> {
        return this.categoryRepository.find({ where: { section } });
    }

    async createCategory(dto: CreateAdminFaqCategoryDto): Promise<AdminFaqCategory> {
        const newCategory = this.categoryRepository.create(dto);
        return this.categoryRepository.save(newCategory);
    }

    async updateCategory(id: string, dto: Partial<CreateAdminFaqCategoryDto>): Promise<AdminFaqCategory> {
        const category = await this.categoryRepository.findOne(
            { where: { id }
            } as any);

        if (!category) throw new NotFoundException('دسته‌بندی یافت نشد');
        Object.assign(category, dto);
        return this.categoryRepository.save(category);
    }

    async deleteCategory(id: string): Promise<void> {
        await this.categoryRepository.delete(id);
    }

    // --- FAQs ---
    async findAll(section?: string, categoryId?: string): Promise<AdminFaq[]> {
        const queryBuilder = this.faqRepository.createQueryBuilder('faq')
            .leftJoinAndSelect('faq.category', 'category');

        if (section) {
            queryBuilder.andWhere('faq.section = :section', { section });
        }
        if (categoryId) {
            queryBuilder.andWhere('faq.categoryId = :categoryId', { categoryId });
        }

        return queryBuilder.orderBy('faq.order', 'ASC').getMany();
    }

    async findOne(id: string): Promise<AdminFaq> {
        const faq = await this.faqRepository.findOne(
            { where: { id },
                relations: ['category']
            } as any);

        if (!faq) throw new NotFoundException('سوال یافت نشد');
        return faq;
    }

    async create(dto: CreateAdminFaqDto): Promise<AdminFaq> {
        const faq = this.faqRepository.create(dto);
        return this.faqRepository.save(faq);
    }

    async update(id: string, dto: UpdateAdminFaqDto): Promise<AdminFaq> {
        const faq = await this.findOne(id);
        Object.assign(faq, dto);
        return this.faqRepository.save(faq);
    }

    async remove(id: string): Promise<void> {
        await this.faqRepository.delete(id);
    }
}