import { PartialType } from '@nestjs/mapped-types';
import { CreateCategoryTypeDto } from './create-category-type.dto';

export class UpdateCategoryTypeDto extends PartialType(CreateCategoryTypeDto) {}
