// src/modules/category/category.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository } from 'typeorm';
import { Category } from './category.entity';
import { CategoryTypeEntity } from './category-type.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import slugify from 'slugify';

@Injectable()
export class CategoryService {
    private treeRepo: TreeRepository<Category>;

    constructor(
        @InjectRepository(Category) private readonly repo: Repository<Category>,
    ) {
        this.treeRepo = this.repo.manager.getTreeRepository(Category);
    }

    private async ensureUniqueSlug(base: string, idToIgnore?: string) {
        let baseSlug = slugify(base || '', { lower: true, strict: true });
        if (!baseSlug) baseSlug = `cat-${Date.now()}`;
        let slug = baseSlug;
        let i = 1;
        while (await this.repo.findOne({ where: { slug } , withDeleted: true })) {
            if (idToIgnore) {
                const existing = await this.repo.findOne({ where: { slug } , withDeleted: true });
                if (existing && existing.id === idToIgnore) break;
            }
            slug = `${baseSlug}-${i++}`;
        }
        return slug;
    }

    async create(dto: CreateCategoryDto) {

        let typeEntity: CategoryTypeEntity | null = null;
        if (dto.typeId) {
            typeEntity = await this.repo.manager.findOne(CategoryTypeEntity, { where: { id: dto.typeId } as any });
            if (!typeEntity) throw new NotFoundException('نوع دسته‌بندی یافت نشد');
        }

        const category = this.repo.create({
            title: dto.title,
            contentType:dto.contentType,
            description: dto.description,
            color:dto.color,
            icon:dto.icon,
            cover:dto.cover??'',
            logo:dto.logo??'',
            isActive: dto.isActive ?? true,
            sortOrder: dto.sortOrder ?? 0,
            type: typeEntity ?? undefined,
        });

        category.slug = dto.slug ? await this.ensureUniqueSlug(dto.slug) : await this.ensureUniqueSlug(dto.title);

        if (dto.parentId) {
            const parent = await this.repo.findOne({ where: { id: dto.parentId } });
            if (!parent) throw new NotFoundException('والد پیدا نشد');
            category.parent = parent;
        }

        const saved = await this.repo.save(category);
        return this.repo.findOne({
            where: { id: saved.id },
            relations: ['parent', 'type']
        });
    }

    async update(id: string, dto: UpdateCategoryDto) {
        const cat = await this.repo.findOne({ where: { id }, relations: ['parent', 'type'] });
        if (!cat) throw new NotFoundException('دسته پیدا نشد');

        // بررسی parent
        if (dto.parentId) {
            if (dto.parentId === id) throw new BadRequestException('دسته نمی‌تواند والد خودش باشد');
            const parent = await this.repo.findOne({ where: { id: dto.parentId } });
            if (!parent) throw new NotFoundException('والد پیدا نشد');

            const descendants = await this.treeRepo.findDescendants(cat);
            if (descendants.some(d => d.id === parent.id)) {
                throw new BadRequestException('والد نمی‌تواند از زیرشاخه‌های خودش باشد');
            }
            cat.parent = parent;
        } else if (dto.parentId === null) {
            cat.parent = null;
        }

        if (dto.typeId) {
            const typeEntity = await this.repo.manager.findOne(CategoryTypeEntity, { where: { id: dto.typeId } as any });
            if (!typeEntity) throw new NotFoundException('نوع دسته‌بندی یافت نشد');
            cat.type = typeEntity;
        }

        // سایر فیلدها
        if (dto.title) cat.title = dto.title;
        if (dto.contentType) cat.contentType = dto.contentType;
        if (dto.description !== undefined) cat.description = dto.description;
        if (dto.isActive !== undefined) cat.isActive = dto.isActive;
        if (dto.sortOrder !== undefined) cat.sortOrder = dto.sortOrder;
        if (dto.icon !== undefined) cat.icon = dto.icon;
        if (dto.cover !== undefined) cat.cover = dto.cover;
        if (dto.logo !== undefined) cat.logo = dto.logo;
        if (dto.color !== undefined) cat.color = dto.color;
        if (dto.slug) cat.slug = await this.ensureUniqueSlug(dto.slug, id);
        else if (dto.title) cat.slug = await this.ensureUniqueSlug(dto.title, id);

        return this.repo.save(cat);
    }

    // soft delete
    async softDelete(id: string) {
        const category = await this.repo.findOne({ where: { id } });
        if (!category) throw new NotFoundException('دسته پیدا نشد');

        // گرفتن تمام descendants
        const descendants = await this.treeRepo.findDescendants(category);

        // اضافه کردن خود node اصلی
        const allToDelete = [category, ...descendants];

        return this.repo.softRemove(allToDelete);
    }


    async restore(id: string) {
        const c = await this.repo.findOne({ where: { id }, withDeleted: true });
        if (!c) throw new NotFoundException('دسته پیدا نشد (حتی حذف‌شده)');
        return this.repo.restore(id);
    }

    async removeHard(id: string) {
        const c = await this.repo.findOne({ where: { id }, withDeleted: true });
        if (!c) throw new NotFoundException('دسته پیدا نشد');
        return this.repo.remove(c);
    }

    async findAllFlat(filters?: { typeId?: string; contentType?: string; activeOnly?: boolean }) {
        const qb = this.repo.createQueryBuilder('c')
            .leftJoinAndSelect('c.type', 'type')
            .leftJoinAndSelect('c.parent', 'parent')
            .leftJoinAndSelect('c.posts', 'posts')
            .leftJoinAndSelect('c.documents', 'documents')
            .leftJoinAndSelect('c.movies', 'movies')
            .leftJoinAndSelect('c.series', 'series')
            .leftJoinAndSelect('c.film_posts', 'film_posts')
            .orderBy('c.sortOrder', 'ASC');

        if (filters?.typeId)
            qb.andWhere('c.typeId = :typeId', { typeId: filters.typeId });

        if (filters?.activeOnly)
            qb.andWhere('c.isActive = true');

        if (filters?.contentType)
            qb.andWhere('c.contentType = :contentType', { contentType: filters.contentType });

        qb.andWhere('c.deletedAt IS NULL');

        return qb.getMany();
    }


    async findTreeByType(typeId?: string, contentType?: string) {
        const qb = this.repo.createQueryBuilder('c')
            .leftJoinAndSelect('c.children', 'children')
            .leftJoinAndSelect('c.type', 'type')
            .leftJoinAndSelect('c.parent', 'parent')
            .leftJoinAndSelect('c.posts', 'posts')
            .where('c.deletedAt IS NULL')
            .andWhere('c.parent IS NULL')
            .orderBy('c.sortOrder', 'ASC');

        if (typeId) qb.andWhere('type.id = :typeId', { typeId });

        if (contentType) {
            qb.andWhere('c.contentType = :contentType', { contentType });
        }

        const roots = await qb.getMany();
        const trees = await Promise.all(
            roots.map(r => this.treeRepo.findDescendantsTree(r, {
                relations: ['posts', 'children', 'children.posts'] // 👈 پست‌های زیر دسته‌ها هم
            }))
        );
        // اضافه کردن parent به همه‌ی children
        trees.forEach(root => attachParentId(root, null));

        return trees;
    }

    async findAncestors(id: string) {
        const node = await this.repo.findOne({ where: { id } });
        if (!node) throw new NotFoundException();
        return this.treeRepo.findAncestors(node);
    }

    async findDescendants(id: string) {
        const node = await this.repo.findOne({ where: { id } });
        if (!node) throw new NotFoundException();
        return this.treeRepo.findDescendants(node);
    }

    // move: تغییر parent و optionally sortOrder
    async move(id: string, newParentId?: string | null, newSortOrder?: number) {
        const node = await this.repo.findOne({ where: { id }});
        if (!node) throw new NotFoundException('دسته پیدا نشد');
        if (newParentId) {
            if (newParentId === id) throw new BadRequestException('نمی‌توان والد را برابر خود قرار داد');
            const parent = await this.repo.findOne({ where: { id: newParentId }});
            if (!parent) throw new NotFoundException('والد جدید پیدا نشد');
            const descendants = await this.treeRepo.findDescendants(node);
            if (descendants.some(d => d.id === parent.id)) throw new BadRequestException('والد جدید نباید از زیرشاخه‌های خودش باشد');
            node.parent = parent;
        } else {
            node.parent = null;
        }
        if (newSortOrder !== undefined) node.sortOrder = newSortOrder;
        return this.repo.save(node);
    }

    async toggleStatus(id: string, isActive: boolean) {
        const category = await this.repo.findOne({ where: { id } });
        if (!category) {
            throw new NotFoundException(`Category with id ${id} not found`);
        }

        category.isActive = isActive;
        await this.repo.save(category);

        return { id: category.id, isActive: category.isActive };
    }


}
function attachParentId(node: any, parentId: string | null = null) {
    node.parentId = parentId;
    if (node.children && node.children.length > 0) {
        node.children.forEach(child => attachParentId(child, node.id));
    }
}
/*
function attachParent(node: any, parent: any | null = null) {
    node.parent = parent ? { id: parent.id, title: parent.title } : null;
    node.parentId = parent ? parent.id : null;

    if (node.children && node.children.length > 0) {
        node.children.forEach(child => attachParent(child, node));
    }
}*/
