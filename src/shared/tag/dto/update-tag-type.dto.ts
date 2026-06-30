import { PartialType } from '@nestjs/mapped-types';
import { CreateTagTypeDto } from './create-tag-type.dto';

export class UpdateTagTypeDto extends PartialType(CreateTagTypeDto) {}
