// src/modules/reference/dto/create-brand.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {Column} from "typeorm";

export class CreateBrandDto {
    @ApiProperty({ example: 'royal-canin', description: 'Unique slug for the brand' })
    slug: string;

    @ApiProperty({ example: 'رویال کنین', description: 'Persian name of the brand' })
    name: string;

    @ApiProperty({ example: 'RC', description: 'Short code for the brand', required: false })
    code?: string;

    @ApiProperty({ example: 'dog', description: 'Slug of the related animal' })
    animalSlug: string;

    /** Reference to the animal */
    @ApiProperty({ example: 'uuid', description: 'Id of the related animal' })
    animalId?: string;
}