import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Series } from './entities/series.entity';
import { Season } from './entities/season.entity';
import { Episode } from './entities/episode.entity';
import { CreateSeriesDto } from './dtos/create-series.dto';
import { UpdateSeriesDto } from './dtos/update-series.dto';
import {Category} from "../../../../shared/category/category.entity";
import {deleteFile} from "../../../../utils/file-upload.utils";
import {NotificationType} from "../../../../shared/notification/notification.entity";
import {NotificationService} from "../../../../shared/notification/notification.service";
import {MediaFavorite} from "../film-favorite.entity";
import {MediaWatchList} from "../film-watch-list.entity";

@Injectable()
export class SeriesService {
    constructor(
        private notifService: NotificationService,
        @InjectRepository(Series) private seriesRepo: Repository<Series>,
        @InjectRepository(Season) private seasonRepo: Repository<Season>,
        @InjectRepository(Episode) private episodeRepo: Repository<Episode>,
        @InjectRepository(MediaFavorite)
        private readonly mediaFavoriteRepo: Repository<MediaFavorite>,
        @InjectRepository(MediaWatchList)
        private readonly mediaWatchListRepo: Repository<MediaWatchList>,
    ) {}

    async create(dto: CreateSeriesDto,user): Promise<Series> {
        const category = await this.seriesRepo.manager.findOne(Category, { where: { id: dto.categoryId } });
        if (!category) throw new NotFoundException('دسته‌بندی پیدا نشد');

        const series = this.seriesRepo.create({
            title: dto.title,
            titleEn: dto.titleEn,
            description: dto.description,
            director: dto.director,
            actors: dto.actors,
            country: dto.country,
            language: dto.language,
            category,
            poster: dto.poster,
            status: dto.status,
            rating: dto.rating,
            tags: dto.tags || [],
            year: dto.year,
            featured: dto.featured,
            keywords: dto.keywords,
            ageRating: dto.ageRating,
        });

        series.seasons = dto.seasons.map(s => {
            const season = new Season();
            season.number = s.number;
            season.title = s.title;
            season.description = s.description??'';

            season.episodes = s.episodes.map(e => {
                const episode = new Episode();
                episode.title = e.title;
                episode.duration = e.duration ?? 0;
                episode.sourceType = e.sourceType ?? 'upload';
                episode.quality = e.quality ?? '';
                episode.videoUrl = e.videoUrl ?? '';
                return episode;
            });

            return season;
        });

        await this.notifService.create({
            userId: user.id,
            type: NotificationType.IN_APP,
            title: 'سریال جدید',
            message: 'سریال جدید با موفقیت ثبت شد.',
            icon:'ti ti-check text-green-600',
            color:'bg-green-100',
            panelType:'film'
        });

        return this.seriesRepo.save(series);
    }


    async findOne(id: string): Promise<Series> {
        const s = await this.seriesRepo.findOne({ where: { id } });
        if (!s) throw new NotFoundException('Series not found');
        return s;
    }

    async findAll(userId?: string): Promise<any[]> {
        // گرفتن همه سریال‌ها همراه با فصل‌ها و اپیزودها
        const seriesList = await this.seriesRepo.find({
            relations: ['category', 'seasons', 'seasons.episodes'],
        });

        if (userId) {
            // علاقه‌مندی‌های سریال
            const seriesFavorites = await this.mediaFavoriteRepo.find({
                where: { user: { id: userId }, mediaType: 'series' },
            } as any);
            const favoriteSeriesIds = seriesFavorites.map(f => f.mediaId);

            // لیست تماشای سریال
            const seriesWatchlists = await this.mediaWatchListRepo.find({
                where: { user: { id: userId }, mediaType: 'series' },
            } as any);
            const watchlistSeriesIds = seriesWatchlists.map(w => w.mediaId);

            // علاقه‌مندی‌های اپیزود
            const episodeFavorites = await this.mediaFavoriteRepo.find({
                where: { user: { id: userId }, mediaType: 'episode' },
            } as any);
            const favoriteEpisodeIds = episodeFavorites.map(f => f.mediaId);

            // لیست تماشای اپیزود
            const episodeWatchlists = await this.mediaWatchListRepo.find({
                where: { user: { id: userId }, mediaType: 'episode' },
            } as any);
            const watchlistEpisodeIds = episodeWatchlists.map(w => w.mediaId);

            // برگرداندن سریال‌ها همراه با وضعیت
            return seriesList.map(series => ({
                ...series,
                favorite: favoriteSeriesIds.includes(series.id),
                watchlist: watchlistSeriesIds.includes(series.id),
                seasons: series.seasons.map(season => ({
                    ...season,
                    episodes: season.episodes.map(ep => ({
                        ...ep,
                        favorite: favoriteEpisodeIds.includes(ep.id),
                        watchlist: watchlistEpisodeIds.includes(ep.id),
                    })),
                })),
            }));
        }

        // اگر userId نبود → همه false
        return seriesList.map(series => ({
            ...series,
            favorite: false,
            watchlist: false,
            seasons: series.seasons.map(season => ({
                ...season,
                episodes: season.episodes.map(ep => ({
                    ...ep,
                    favorite: false,
                    watchlist: false,
                })),
            })),
        }));
    }

    async update(id: string, dto: UpdateSeriesDto): Promise<Series> {

        const series = await this.seriesRepo.findOne({ where: { id } });
        if (!series) throw new NotFoundException('Series not found');

        if (dto.categoryId) {
            const category = await this.seriesRepo.manager.findOne(Category, { where: { id: dto.categoryId } });
            if (!category) throw new NotFoundException('دسته‌بندی پیدا نشد');
            series.category = category;
        } else {
            series.category = null;
        }

        series.title = dto.title ?? series.title;
        series.titleEn = dto.titleEn ?? series.titleEn;
        series.description = dto.description ?? series.description;
        series.director = dto.director ?? series.director;
        series.actors = dto.actors ?? series.actors;
        series.country = dto.country ?? series.country;
        series.language = dto.language ?? series.language;
        series.poster = dto.poster ?? series.poster;
        series.status = dto.status ?? series.status;
        series.rating = dto.rating ?? series.rating;
        series.tags = dto.tags ?? series.tags;
        series.year = dto.year ?? series.year;
        series.featured = dto.featured ?? series.featured;
        series.keywords = dto.keywords ?? series.keywords;
        series.ageRating = dto.ageRating ?? series.ageRating;


        if (dto.seasons) {
            series.seasons = dto.seasons.map(s => {
                const season = new Season();
                season.number = s.number;
                season.title = s.title;
                season.description = s.description ?? '';

                season.episodes = s.episodes.map(e => {
                    const episode = new Episode();
                    episode.number=e.number;
                    episode.title = e.title;
                    episode.duration = e.duration ?? 0;
                    episode.sourceType = e.sourceType ?? 'upload';
                    episode.quality = e.quality ?? '';
                    episode.videoUrl = e.videoUrl ?? '';
                    return episode;
                });

                return season;
            });
        }

        return this.seriesRepo.save(series);
    }


    async remove(id: string) {
        const series = await this.findOne(id);
        if (!series) throw new NotFoundException('Series not found');

        if (series.poster) {
            await deleteFile(series.poster, 'images');
        }

        if (series.seasons) {
            for (const season of series.seasons) {
                if (season.episodes) {
                    for (const episode of season.episodes) {
                        if (episode.videoUrl) {
                            await deleteFile(episode.videoUrl, 'videos');
                        }
                    }
                }
            }
        }

        return this.seriesRepo.remove(series);
    }

    async removeSeason(seriesId: string, seasonId: string) {
        const series = await this.findOne(seriesId);
        series.seasons = series.seasons.filter(s => s.id !== seasonId);
        await this.seasonRepo.delete(seasonId);
        return { message: 'Season deleted successfully' };
    }

    async removeEpisode(seriesId: string, seasonId: string, episodeId: string) {
        const episode = await this.episodeRepo.findOne({ where: { id: episodeId } });
        if (!episode) throw new NotFoundException('Episode not found');

        if (episode.videoUrl) {
            await deleteFile(episode.videoUrl,'videos');
        }

        await this.episodeRepo.delete(episodeId);

        return { message: 'Episode and file deleted successfully' };
    }


}