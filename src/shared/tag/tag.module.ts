// file: tag.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tag } from './tag.entity';
import { TagService } from './tag.service';
import { TagController } from './tag.controller';
import {TagTypeController} from "./tag-type.controller";
import {TagTypeService} from "./tag-type.service";
import {TagType} from "./tag-type.entity";


@Module({
    imports: [TypeOrmModule.forFeature([Tag,TagType])],
    providers: [TagService,TagTypeService],
    controllers: [TagController,TagTypeController],
    exports: [TagService,TagTypeService],
})
export class TagModule {}