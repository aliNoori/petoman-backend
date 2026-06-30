import {Injectable, NotFoundException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {In, Repository} from 'typeorm';
import {FilmPost} from "./post.entity";
import {Category} from "../../../shared/category/category.entity";
import {CreateFilmPostDto} from "./dto/create-film-post.dto";
import {UpdateFilmPostDto} from "./dto/update-film-post.dto";
import {NotificationType} from "../../../shared/notification/notification.entity";
import {NotificationService} from "../../../shared/notification/notification.service";

@Injectable()
export class PostFilmService {
    constructor(
        private notifService: NotificationService,
        @InjectRepository(FilmPost)
        private readonly postRepo: Repository<FilmPost>,
        @InjectRepository(Category)
        private readonly categoryRepo: Repository<Category>,
    ) {}

    async create(dto: CreateFilmPostDto,onlineUser) {

        const category = await this.categoryRepo.findOne({ where: { id: dto.categoryId } });
        if (!category) throw new NotFoundException('Category not found');

        // مپ کردن دستی فیلدها
        const post = this.postRepo.create({
            title: dto.title,
            slug: dto.slug,
            content: dto.content,
            excerpt: dto.excerpt,
            metaTitle: dto.metaTitle,
            metaDescription: dto.metaDescription,
            status: dto.status,
            thumbnailUrl: dto.thumbnailUrl,
            tags: dto.tags,
            publishDate: dto.publishDate,
            category,
        });

        await this.notifService.create({
            userId: onlineUser.id,
            type: NotificationType.POST,
            title: 'پست جدید',
            message: 'پست جدید با موفقیت ثبت شد.',
            icon:'ti ti-check text-green-600',
            color:'bg-green-100',
            panelType:'film'
        });

        return this.postRepo.save(post);
    }

    async findAll() {
        return this.postRepo.find({
            order: { createdAt: 'DESC' },
            relations: ['category'],
        });
    }

    async findOne(id: string) {
        const post = await this.postRepo.findOne({
            where: { id },
            relations: ['category'],
        });
        if (!post) throw new NotFoundException('پست پیدا نشد');
        return post;
    }

    async update(id: string, dto: UpdateFilmPostDto) {
        const post = await this.findOne(id);

        const category = await this.categoryRepo.findOne({ where: { id: dto.categoryId } });
        if (!category) throw new NotFoundException('Category not found');



        // سایر فیلدها
        Object.assign(post, {category,
            title: dto.title ?? post.title,
            slug: dto.slug ?? post.slug,
            content: dto.content ?? post.content,
            excerpt: dto.excerpt ?? post.excerpt,
            metaTitle: dto.metaTitle ?? post.metaTitle,
            metaDescription: dto.metaDescription ?? post.metaDescription,
            status: dto.status ?? post.status,
            thumbnailUrl: dto.thumbnailUrl ?? post.thumbnailUrl,
            tags: dto.tags ?? post.tags,
            publishDate: dto.publishDate ? new Date(dto.publishDate) : post.publishDate,
            commentsEnabled:dto.commentsEnabled??post.commentsEnabled,
        });

        return this.postRepo.save(post);
    }

    async remove(id: string) {
        const post = await this.findOne(id);
        return this.postRepo.remove(post);
    }

    async incrementViews(id: string) {
        const post = await this.findOne(id);
        post.views = (post.views ?? 0) + 1;
        return this.postRepo.save(post);
    }

    async incrementLikes(id: string) {
        const post = await this.findOne(id);
        post.likes = (post.likes ?? 0) + 1;
        return this.postRepo.save(post);
    }

    async decrementLikes(id: string) {
        const post = await this.findOne(id);
        post.likes = Math.max((post.likes ?? 0) - 1, 0);
        return this.postRepo.save(post);
    }
}
