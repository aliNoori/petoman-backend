// src/modules/reference/dto/update-attribute.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateAttributeDto } from './create-attribute.dto';

export class UpdateAttributeDto extends PartialType(CreateAttributeDto) {}
