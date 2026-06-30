import {Module} from "@nestjs/common";
import {TypeOrmModule} from "@nestjs/typeorm";
import {PostController} from "./post.controller";
import {PostService} from "./post.service";
import {Post} from "./post.entity"
import {Category} from "../../../shared/category/category.entity";
import {NotificationModule} from "../../../shared/notification/notification.module";
import {PostLike} from "./post-like.entity";
import {PostBookmark} from "./post-bookmark.entity";
import {JwtModule} from "@nestjs/jwt";
import {SessionModule} from "../../../shared/user/session.module";

@Module({
    imports: [TypeOrmModule.forFeature([Post,Category,PostLike,PostBookmark]),NotificationModule,JwtModule,SessionModule],
    controllers: [PostController],
    providers: [PostService],
})
export class PostModule {}
