import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { NotificationService } from "../../../shared/notification/notification.service";
import { User } from "../../../shared/user/entities/user.entity";
import { MediaFavorite } from "./film-favorite.entity";
import { MediaWatchList } from "./film-watch-list.entity";
import { Movie } from "./movie/movie.entity";
import { Series } from "./series/entities/series.entity";
import { Episode } from "./series/entities/episode.entity";
import {MediaWatched} from "./media-watched.entity";

type MediaType = 'movie' | 'series' | 'episode';

@Injectable()
export class MediaService {
    constructor(
        //private notifService: NotificationService,
        @InjectRepository(Series)
        private readonly seriesRepo: Repository<Series>,
        @InjectRepository(Movie)
        private readonly movieRepo: Repository<Movie>,
        @InjectRepository(Episode)
        private readonly episodeRepo: Repository<Episode>,
        @InjectRepository(MediaFavorite)
        private readonly mediaFavoriteRepo: Repository<MediaFavorite>,
        @InjectRepository(MediaWatchList)
        private readonly mediaWatchListRepo: Repository<MediaWatchList>,
        @InjectRepository(MediaWatched)
        private readonly mediaWatchedRepo: Repository<MediaWatched>


    ) {}

    // 🔹 پیدا کردن media بر اساس type
    private async findMedia(mediaId: string, mediaType: MediaType) {
        if (mediaType === 'movie') {
            return this.movieRepo.findOne({ where: { id: mediaId } });
        }
        if (mediaType === 'series') {
            return this.seriesRepo.findOne({ where: { id: mediaId } });
        }
        if (mediaType === 'episode') {
            return this.episodeRepo.findOne({ where: { id: mediaId } });
        }
        throw new NotFoundException('نوع مدیا نامعتبر است');
    }

    // 🔹 Toggle Favorite
    async toggleFavorite(mediaId: string, mediaType: MediaType, userId: string) {
        const media = await this.findMedia(mediaId, mediaType);
        if (!media) throw new NotFoundException('مدیا یافت نشد');

        const existing = await this.mediaFavoriteRepo.findOne({
            where: { mediaId, mediaType, user: { id: userId } },
            relations: ['user'],
        } as any);

        if (existing) {
            await this.mediaFavoriteRepo.remove(existing);
            return { favorite: false };
        } else {
            const favorite = this.mediaFavoriteRepo.create({
                mediaId,
                mediaType,
                user: { id: userId } as User,
            });
            await this.mediaFavoriteRepo.save(favorite);
            return { favorite: true };
        }
    }

    // 🔹 Toggle WatchList
    async toggleWatchList(mediaId: string, mediaType: MediaType, userId: string) {
        const media = await this.findMedia(mediaId, mediaType);
        if (!media) throw new NotFoundException('مدیا یافت نشد');

        const existing = await this.mediaWatchListRepo.findOne({
            where: { mediaId, mediaType, user: { id: userId } },
            relations: ['user'],
        } as any);

        if (existing) {
            await this.mediaWatchListRepo.remove(existing);
            return { watchlist: false };
        } else {
            const watchlist = this.mediaWatchListRepo.create({
                mediaId,
                mediaType,
                user: { id: userId } as User,
            });
            await this.mediaWatchListRepo.save(watchlist);
            return { watchlist: true };
        }
    }

    async getWatched(userId: string) {
        return this.mediaWatchedRepo.find({
            where: { user: { id: userId } },
            order: { updatedAt: 'DESC' },
        } as any)
    }

    async updateWatched(
        mediaId: string,
        mediaType: MediaType,
        currentTime: number,
        duration: number,
        progress: number,
        userId: string
    ) {
        const media = await this.findMedia(mediaId, mediaType)
        if (!media) throw new NotFoundException('مدیا یافت نشد')

        let watched = await this.mediaWatchedRepo.findOne({
            where: { mediaId, mediaType, user: { id: userId } },
            relations: ['user'],
        } as any)

        if (!watched) {
            watched = this.mediaWatchedRepo.create({
                mediaId,
                mediaType,
                currentTime,
                duration,
                progress,
                user: { id: userId } as User,
            })
        } else {
            watched.currentTime = currentTime
            watched.duration = duration
            watched.progress = progress

        }

        return this.mediaWatchedRepo.save(watched)
    }


}