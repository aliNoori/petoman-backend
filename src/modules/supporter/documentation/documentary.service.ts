import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Documentary } from './documentary.entity';
import { CreateDocumentaryDto } from './dto/create-documentary.dto';
import { UpdateDocumentaryDto } from './dto/update-documentary.dto';
import { Category } from '../../../shared/category/category.entity';
import {join} from "path";
import { unlink } from 'fs/promises';

@Injectable()
export class DocumentaryService {
    constructor(
        @InjectRepository(Documentary)
        private readonly documentaryRepo: Repository<Documentary>,
    ) {}

    async create(dto: CreateDocumentaryDto) {
        const category = await this.documentaryRepo.manager.findOne(Category, {
            where: { id: dto.categoryId },
        });
        if (!category) throw new NotFoundException('دسته‌بندی پیدا نشد');

        const documentary = this.documentaryRepo.create({
            title: dto.title,
            description: dto.description,
            thumbnailPreview: dto.thumbnailPreview,
            videoUrl: dto.videoUrl,
            videoFile: dto.videoFile,
            duration: dto.duration,
            tags: dto.tags,
            publishDate: dto.publishDate,
            status: dto.status,
            slug: dto.slug,
            seoTitle: dto.seoTitle,
            seoDescription: dto.seoDescription,
            seoKeywords: dto.seoKeywords,
            category,
            categoryId: category.id,
        });

        return this.documentaryRepo.save(documentary);
    }

    async findAll() {
        return this.documentaryRepo.find({
            order: { publishDate: 'DESC' },
        });
    }

    async findOne(id: string) {
        const documentary = await this.documentaryRepo.findOneBy({ id });
        if (!documentary) throw new NotFoundException('مستند پیدا نشد');
        return documentary;
    }

    async removeById(id: string) {
        await this.documentaryRepo.delete(id);
        return { message: 'مستند و فایل‌های مرتبط حذف شدند' };
    }

    async update(id: string, dto: UpdateDocumentaryDto) {
        const documentary = await this.findOne(id);

        if (dto.categoryId) {
            const category = await this.documentaryRepo.manager.findOne(Category, {
                where: { id: dto.categoryId },
            });
            if (!category) throw new NotFoundException('دسته‌بندی پیدا نشد');
            documentary.category = category;
            documentary.categoryId = category.id;
        }

        Object.assign(documentary, {
            ...dto,
            category: documentary.category,
            categoryId: documentary.categoryId,
        });

        return this.documentaryRepo.save(documentary);
    }

    async remove(id: string) {
        const documentary = await this.findOne(id);
        return this.documentaryRepo.remove(documentary);
    }

    async deleteOldFile(id: string, field: 'videoFile' | 'thumbnailPreview') {
        try {
            const documentary = await this.findOne(id);
            const oldPath = documentary[field];

            if (oldPath && oldPath.includes('/uploads/documentaries')) {
                const filename = oldPath.split('/').pop();
                if (typeof filename === 'string') {
                    const fullPath = join(process.cwd(), 'uploads', 'documentaries', filename);
                    await unlink(fullPath).catch(() => null); // ✅ حالا fullPath موجوده
                    console.log(`🧹 فایل قدیمی حذف شد: ${filename}`);
                }
            }
        } catch (e) {
            console.warn(`⚠️ خطا در حذف فایل ${field}:`, (e as Error).message);
        }
    }
}