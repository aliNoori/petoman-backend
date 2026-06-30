// src/modules/reference/reference.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferenceService } from './reference.service';
import { ReferenceController } from './reference.controller';
import { Animal } from './entities/animal.entity';
import { Brand } from './entities/brand.entity';
import { Attribute } from './entities/attribute.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Animal, Brand, Attribute])],
    providers: [ReferenceService],
    controllers: [ReferenceController],
})
export class ReferenceModule {}