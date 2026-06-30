import {
    Controller,
    Patch,
    Param,
    Body,
    ParseUUIDPipe,
    UseGuards, Get,
} from '@nestjs/common';

import { JwtAuthGuard } from "../../../shared/auth/guards/jwt-auth.guard";
import { CurrentUser } from "../../../shared/auth/guards/current-user.decorator";
import { User } from "../../../shared/user/entities/user.entity";
import { MediaService } from "./media.service";
import {BlacklistGuard} from "../../../shared/auth/guards/blacklist.guard";

type MediaType = 'movie' | 'series' | 'episode';

@Controller({ path: 'media', version: '1' })
export class MediaController {
    constructor(private readonly mediaService: MediaService) {}

    @UseGuards(JwtAuthGuard,BlacklistGuard)
    @Patch(':id/favorite')
    async toggleFavorite(
        @Param('id', ParseUUIDPipe) id: string,
        @Body('mediaType') mediaType: MediaType,
        @CurrentUser() user: User,
    ) {
        const userId = user.id;
        if (!userId) {
            throw new Error('User not authenticated');
        }
        return this.mediaService.toggleFavorite(id, mediaType, userId);
    }

    @UseGuards(JwtAuthGuard,BlacklistGuard)
    @Patch(':id/watch-list')
    async toggleWatchList(
        @Param('id', ParseUUIDPipe) id: string,
        @Body('mediaType') mediaType: MediaType,
        @CurrentUser() user: User,
    ) {
        const userId = user.id;
        if (!userId) {
            throw new Error('User not authenticated');
        }
        return this.mediaService.toggleWatchList(id, mediaType, userId);
    }

    @UseGuards(JwtAuthGuard,BlacklistGuard)
    @Get('watched')
    getWatched(@CurrentUser() user: User) {
        return this.mediaService.getWatched(user.id)
    }

    @UseGuards(JwtAuthGuard,BlacklistGuard)
    @Patch('watched')
    updateWatched(
        @Body('mediaId') mediaId: string,
        @Body('mediaType') mediaType: MediaType,
        @Body('progress') progress: number,
        @Body('currentTime') currentTime: number,
        @Body('duration') duration: number,
        @CurrentUser() user: User,
    ) {
        return this.mediaService.updateWatched(
            mediaId,
            mediaType,
            currentTime,
            duration,
            progress,
            user.id
        )
    }

}