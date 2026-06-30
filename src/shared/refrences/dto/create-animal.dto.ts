// src/modules/reference/dto/create-animal.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class CreateAnimalDto {
    @ApiProperty({ example: 'dog', description: 'Unique slug for the animal' })
    slug: string;

    @ApiProperty({ example: 'سگ', description: 'Persian name of the animal' })
    name: string;

    @ApiProperty({ example: '🐕', description: 'Icon or emoji for the animal', required: false })
    icon?: string;

    @ApiProperty({ example: 'D', description: 'Short code for the animal', required: false })
    code?: string;
}