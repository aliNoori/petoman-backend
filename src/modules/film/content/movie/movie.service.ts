import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {CreateMovieDto} from "./dto/movie-create.dto";
import {Movie} from "./movie.entity";
import {Category} from "../../../../shared/category/category.entity";
import {UpdateMovieDto} from "./dto/movie-update.dto";
import {deleteFile} from "../../../../utils/file-upload.utils";
import {NotificationType} from "../../../../shared/notification/notification.entity";
import {NotificationService} from "../../../../shared/notification/notification.service";
import {Episode} from "../series/entities/episode.entity";
import {MediaFavorite} from "../film-favorite.entity";
import {MediaWatchList} from "../film-watch-list.entity";


@Injectable()
export class MovieService {
    constructor(
        private notifService: NotificationService,
        @InjectRepository(Movie)
        private readonly movieRepo: Repository<Movie>,
        @InjectRepository(Category)
        private readonly categoryRepo: Repository<Category>,
        @InjectRepository(MediaFavorite)
        private readonly mediaFavoriteRepo: Repository<MediaFavorite>,
        @InjectRepository(MediaWatchList)
        private readonly mediaWatchListRepo: Repository<MediaWatchList>,
    ) {}

    async create(dto: CreateMovieDto,user): Promise<Movie> {
        const category = await this.categoryRepo.findOne({ where: { id: dto.categoryId } });
        if (!category) throw new NotFoundException('Category not found');

        const movie = this.movieRepo.create({
            ...dto,
            category,
        });

        await this.notifService.create({
            userId: user.id,
            type: NotificationType.IN_APP,
            title: 'فیلم جدید',
            message: 'فیلم جدید با موفقیت ثبت شد.',
            icon:'ti ti-check text-green-600',
            color:'bg-green-100',
            panelType:'film'
        });

        return this.movieRepo.save(movie);
    }


    async findAll(userId?: string): Promise<any[]> {
        const movies = await this.movieRepo.find({ relations: ['category'] });

        if (userId) {
            // گرفتن لیست علاقه‌مندی‌های کاربر
            const favorites = await this.mediaFavoriteRepo.find({
                where: { user: { id: userId }, mediaType: 'movie' },
                relations: ['user'],
            } as any);
            const favoriteMovieIds = favorites.map(f => f.mediaId);

            // گرفتن لیست watchlist کاربر
            const watchlists = await this.mediaWatchListRepo.find({
                where: { user: { id: userId }, mediaType: 'movie' },
                relations: ['user'],
            } as any);
            const watchlistMovieIds = watchlists.map(w => w.mediaId);

            ////TODO:Test notification global and projects

            await this.notifService.create({
                userId: userId,
                type: NotificationType.IN_APP,
                title: 'سریال جدید',
                message: 'سریال جدید به بخش سریال ها اضافه شد',
                icon: 'ti ti-movie text-yellow-500',
                color: 'bg-yellow-500/10',
                panelType: 'film',
            });



            // برگردوندن فیلم‌ها همراه با وضعیت علاقه‌مندی و لیست تماشا
            return movies.map(movie => ({
                ...movie,
                favorite: favoriteMovieIds.includes(movie.id),
                watchlist: watchlistMovieIds.includes(movie.id),
            }));
        }

        // اگر userId نبود → همه false
        return movies.map(movie => ({
            ...movie,
            favorite: false,
            watchlist: false,
        }));
    }

    async findOne(id: string): Promise<Movie> {
        const movie = await this.movieRepo.findOne({
            where: { id },
            relations: ['category'],
        });
        if (!movie) throw new NotFoundException('Movie not found');
        return movie;
    }

    async update(id: string, dto: UpdateMovieDto): Promise<Movie> {
        const movie = await this.findOne(id);
        const category = await this.categoryRepo.findOne({
            where: { id: dto.categoryId },
        });
        if (!category) throw new NotFoundException('Category not found');

        Object.assign(movie, dto, { category });
        return this.movieRepo.save(movie);
    }

    async remove(id: string): Promise<void> {
        const movie = await this.findOne(id);

        if (movie.poster) {
            await deleteFile(movie.poster, 'images');
        }
        if (movie.videoLink) {
            await deleteFile(movie.videoLink, 'videos');
        }
        await this.movieRepo.remove(movie);
    }
}
