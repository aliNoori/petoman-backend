import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {Movie} from "./content/movie/movie.entity";
import {Category} from "../../shared/category/category.entity";
import {MovieController} from "./content/movie/movie.controller";
import {MovieService} from "./content/movie/movie.service";
import {Series} from "./content/series/entities/series.entity";
import {SeriesController} from "./content/series/series.controller";
import {SeriesService} from "./content/series/series.service";
import {Season} from "./content/series/entities/season.entity";
import {Episode} from "./content/series/entities/episode.entity";
import {FilmPage} from "./page/page.entity";
import {PageController} from "./page/page.controller";
import {PageService} from "./page/page.service";
import {FilmPost} from "./post/post.entity";
import {PostFilmService} from "./post/post.service";
import {NotificationModule} from "../../shared/notification/notification.module";
import {PostFilmController} from "./post/post.controller";
import {CommentController} from "./comment/comment.controller";
import {CommentService} from "./comment/comment.service";
import {Comment} from "./comment/comment.entity";
import {FilmSettingModule} from "./setting/setting.modules";
import {MediaModule} from "./content/media.module";
import {MediaFavorite} from "./content/film-favorite.entity";
import {MediaWatchList} from "./content/film-watch-list.entity";
import {ReportController} from "./report/report.controller";
import {ReportService} from "./report/report.service";
import {ReportEntity} from "./report/report.entity";

@Module({
    imports: [TypeOrmModule.forFeature([Movie, Category,Series,Season,Episode,FilmPage,FilmPost,Comment,MediaFavorite,MediaWatchList,ReportEntity]),NotificationModule,FilmSettingModule,MediaModule],
    controllers: [MovieController,SeriesController,PageController,PostFilmController,CommentController,ReportController],
    providers: [MovieService,SeriesService,PageService,PostFilmService,CommentService,ReportService],
})
export class FilmModule {}
