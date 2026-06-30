import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {AdminFaqsService} from "./admin-faqs.service";
import {AdminFaqsController} from "./admin-faqs.controller";
import {AdminFaqCategory} from "./entities/admin-faqs-category.entity";
import {AdminFaq} from "./entities/admin-faqs.entity";


@Module({
    imports: [TypeOrmModule.forFeature([AdminFaq, AdminFaqCategory])],
    controllers: [AdminFaqsController],
    providers: [AdminFaqsService],
    exports: [AdminFaqsService],
})
export class AdminFaqsModule {}