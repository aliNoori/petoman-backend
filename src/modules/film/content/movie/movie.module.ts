import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MovieService } from './movie.service';
import { MovieController } from './movie.controller';
import {Category} from "../../../../shared/category/category.entity";
import {Movie} from "./movie.entity";

@Module({
    imports: [TypeOrmModule.forFeature([Movie, Category])],
    controllers: [MovieController],
    providers: [MovieService],
})
export class MovieModule {}
