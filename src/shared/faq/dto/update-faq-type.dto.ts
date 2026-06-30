import { PartialType } from '@nestjs/mapped-types';
import {CreateFaqTypeDto} from "./create-faq-type.dto";

export class UpdateFaqTypeDto extends PartialType(CreateFaqTypeDto) {}
