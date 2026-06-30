import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Series } from './entities/series.entity';
import { Season } from './entities/season.entity';
import { Episode } from './entities/episode.entity';
import { SeriesService } from './series.service';
import { SeriesController } from './series.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Series, Season, Episode])],
    controllers: [SeriesController],
    providers: [SeriesService],
})
export class SeriesModule {}
