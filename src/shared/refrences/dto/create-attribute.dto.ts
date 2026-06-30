// src/modules/reference/dto/create-attribute.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class CreateAttributeDto {
    @ApiProperty({ example: 'chicken', description: 'Unique slug for the attribute' })
    slug: string;

    @ApiProperty({ example: 'طعم مرغ', description: 'Persian name of the attribute' })
    name: string;

    @ApiProperty({ example: 'taste', description: 'Type of attribute (taste, age, weight, packaging, special)' })
    type: string;

    @ApiProperty({ example: 'cat', description: 'Slug of the related animal' })
    animalSlug: string;

    /** Reference to the animal */
    @ApiProperty({ example: 'uuid', description: 'Id of the related animal' })
    animalId?: string;
}