// file: tag.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {FaqTypeService} from "./faq-type.service";
import {FaqService} from "./faq.service";
import {FaqController} from "./faq.controller";
import {FaqTypeController} from "./faq-type.controller";
import {FaqType} from "./faq-type.entity";
import {Faq} from "./faq.entity";


@Module({
    imports: [TypeOrmModule.forFeature([Faq,FaqType])],
    providers: [FaqService,FaqTypeService],
    controllers: [FaqController,FaqTypeController],
    exports: [FaqService,FaqTypeService],
})
export class FaqModule {}