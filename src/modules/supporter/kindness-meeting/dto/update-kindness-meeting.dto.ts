import { PartialType } from '@nestjs/mapped-types';
import { CreateKindnessMeetingDto } from './create-kindness-meeting.dto';

export class UpdateKindnessMeetingDto extends PartialType(CreateKindnessMeetingDto) {}
