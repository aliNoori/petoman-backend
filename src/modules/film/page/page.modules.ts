import {Module} from "@nestjs/common";
import {TypeOrmModule} from "@nestjs/typeorm";
import {FilmPage} from "./page.entity";
import {PageController} from "./page.controller";
import {PageService} from "./page.service";

@Module({
    imports: [TypeOrmModule.forFeature([FilmPage])],
    controllers: [PageController],
    providers: [PageService],
})
export class FilmPageModule {}
