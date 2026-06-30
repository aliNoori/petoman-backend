// file: tag.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tag } from './tag.entity';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import {TagType} from "./tag-type.entity";


@Injectable()
export class TagService {
    constructor(
        @InjectRepository(Tag)
        private tagRepository: Repository<Tag>,
    ) {}


    async findAllFlat(filters?: { typeId?: string;contentType?:string; activeOnly?: boolean }) {
        const qb = this.tagRepository.createQueryBuilder('c')
            .leftJoinAndSelect('c.type', 'type')
        if (filters?.typeId) qb.andWhere('c.typeId = :typeId', { typeId: filters.typeId });
        if (filters?.contentType) qb.andWhere('c.contentType = :contentType', { contentType: filters.contentType });
        return qb.getMany();
    }


    findOne(id: string) {
        return this.tagRepository.findOne({ where: { id } });
    }


    async create(dto: CreateTagDto) {
        let typeEntity: TagType | null = null;
        if (dto.typeId) {
            typeEntity = await this.tagRepository.manager.findOne(TagType, { where: { id: dto.typeId } as any });
            if (!typeEntity) throw new NotFoundException('نوع تگ یافت نشد');
        }

        const tag = this.tagRepository.create({
            name:dto.name,
            slug:dto.slug,
            description: dto.description,
            contentType:dto.contentType,
            color: dto.color,
            isActive: dto.isActive ?? true,
            type: typeEntity ?? undefined,
        });

        return this.tagRepository.save(tag);
    }


    async update(id: string, dto: UpdateTagDto) {
        const tag = await this.tagRepository.findOne({ where: { id } });
        if (!tag) throw new NotFoundException('Tag not found');

        // اگر typeId داده شده باشه، موجودیت مربوطه رو پیدا کن
        let typeEntity: TagType | null = null;
        if (dto.typeId) {
            typeEntity = await this.tagRepository.manager.findOne(TagType, { where: { id: dto.typeId } as any });
            if (!typeEntity) throw new NotFoundException('نوع تگ یافت نشد');
        }

        tag.name = dto.name ?? tag.name;
        tag.description = dto.description ?? tag.description;
        tag.contentType = dto.contentType ?? tag.contentType;
        tag.color = dto.color ?? tag.color;
        tag.isActive = dto.isActive ?? tag.isActive;
        tag.type = typeEntity ?? tag.type;

        return this.tagRepository.save(tag);
    }

    async incrementCount(id: string) {
        const tag = await this.tagRepository.findOne({ where: { id } });
        if (!tag) throw new NotFoundException('Tag not found');

        tag.count = (tag.count || 0) + 1;
        tag.lastUsed = new Date().toISOString();

        return await this.tagRepository.save(tag);
    }

    async decrementCount(id: string) {
        const tag = await this.tagRepository.findOne({ where: { id } });
        if (!tag) throw new NotFoundException('Tag not found');

        if (tag.count > 0) {
            tag.count = tag.count - 1;
            tag.lastUsed = new Date().toISOString();
            return await this.tagRepository.save(tag);
        }

        return tag; // اگر صفر بود، همون رو برگردون
    }



    async remove(id: string) {
        const tag = await this.tagRepository.findOne({ where: { id } });
        if (!tag) throw new NotFoundException('Tag not found');
        return this.tagRepository.remove(tag);
    }
}