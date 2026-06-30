import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {MediaFavorite} from "./film-favorite.entity";
import {MediaWatchList} from "./film-watch-list.entity";
import {MediaController} from "./media.controller";
import {MediaService} from "./media.service";
import {Notification} from "../../../shared/notification/notification.entity";
import {NotificationService} from "../../../shared/notification/notification.service";
import {Series} from "./series/entities/series.entity";
import {Movie} from "./movie/movie.entity";
import {Episode} from "./series/entities/episode.entity";
import {MediaWatched} from "./media-watched.entity";
import {JwtModule} from "@nestjs/jwt";
import {SessionModule} from "../../../shared/user/session.module";


@Module({
    imports: [TypeOrmModule.forFeature([MediaWatched,MediaFavorite, MediaWatchList,Series,Movie,Episode]),JwtModule,SessionModule],
    controllers: [MediaController],
    providers: [MediaService],
})
export class MediaModule {}
