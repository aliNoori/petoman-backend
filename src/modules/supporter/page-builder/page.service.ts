import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Page } from './page.entity';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { basename } from 'path';

@Injectable()
export class PageService {
    constructor(
        @InjectRepository(Page)
        private readonly pageRepo: Repository<Page>,
    ) {}

    async create(dto: CreatePageDto, file?: Express.Multer.File) {
        const page = this.pageRepo.create(dto);

        if (file) {
            // مسیر ذخیره شده در استوریج یا URL قابل دسترسی
            page.featuredImage = `/uploads/pages/${file.filename}`;
        }

        return this.pageRepo.save(page);
    }

    async findAll() {
        return this.pageRepo.find({ order: { createdAt: 'DESC' } });
    }

    async findOne(id: string) {
        const page = await this.pageRepo.findOneBy({ id });
        if (!page) throw new NotFoundException('صفحه پیدا نشد');
        return page;
    }

    async update(id: string, dto: UpdatePageDto, file?: Express.Multer.File) {
        const page = await this.findOne(id);
        Object.assign(page, dto);

        if (file) {
            page.featuredImage = `/uploads/pages/${file.filename}`;
        }

        return this.pageRepo.save(page);
    }

    async remove(id: string) {
        const page = await this.findOne(id);
        return this.pageRepo.remove(page);
    }
}