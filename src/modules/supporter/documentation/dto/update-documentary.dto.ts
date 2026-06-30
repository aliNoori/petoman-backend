import { PartialType } from '@nestjs/mapped-types';
import { CreateDocumentaryDto } from './create-documentary.dto';

export class UpdateDocumentaryDto extends PartialType(CreateDocumentaryDto) {}
