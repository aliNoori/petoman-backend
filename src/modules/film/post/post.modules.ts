import {Module} from "@nestjs/common";
import {TypeOrmModule} from "@nestjs/typeorm";
import {Category} from "../../../shared/category/category.entity";
import {NotificationModule} from "../../../shared/notification/notification.module";
import {FilmPost} from "./post.entity";
import {PostFilmController} from "./post.controller";
import {PostFilmService} from "./post.service";

@Module({
    imports: [TypeOrmModule.forFeature([FilmPost,Category]),NotificationModule],
    controllers: [PostFilmController],
    providers: [PostFilmService],
})
export class PostFilmModule {}
