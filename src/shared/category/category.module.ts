import { Module } from '@nestjs/common';
import {CategoryService} from "./category.service";
import {CategoryController} from "./category.controller";
import {Category} from "./category.entity";
import {TypeOrmModule} from "@nestjs/typeorm";
import {CategoryTypeEntity} from "./category-type.entity";
import {CategoryTypeController} from "./category-type.controller";
import {CategoryTypeService} from "./category-type.service";


@Module({
    imports: [TypeOrmModule.forFeature([Category,CategoryTypeEntity])],
    controllers: [CategoryController,CategoryTypeController],
    providers: [CategoryService,CategoryTypeService],
    exports: [CategoryService,CategoryTypeService],
})
export class CategoryModule {}
