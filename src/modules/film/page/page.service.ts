import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {FilmPage} from './page.entity';
import { CreateFilmPageDto } from './dto/create-film-page.dto';
import { UpdateFilmPageDto } from './dto/update-film-page.dto';

@Injectable()
export class PageService {
    constructor(
        @InjectRepository(FilmPage)
        private readonly pageRepo: Repository<FilmPage>,
    ) {}

    async create(dto: CreateFilmPageDto, file?: Express.Multer.File) {
        const page = this.pageRepo.create(dto);

        if (file) {
            // مسیر ذخیره شده در استوریج یا URL قابل دسترسی
            page.thumbnailUrl = `/uploads/pages/${file.filename}`;
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

    async update(id: string, dto: UpdateFilmPageDto, file?: Express.Multer.File) {
        const page = await this.findOne(id);
        Object.assign(page, dto);

        if (file) {
            page.thumbnailUrl = `/uploads/pages/${file.filename}`;
        }

        return this.pageRepo.save(page);
    }

    async remove(id: string) {
        const page = await this.findOne(id);
        return this.pageRepo.remove(page);
    }
}