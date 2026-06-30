// src/modules/pets/dto/update-pet.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreatePetDto } from './create-pet.dto';

// PartialType تمام فیلدها را اختیاری می‌کند
export class UpdatePetDto extends PartialType(CreatePetDto) {}