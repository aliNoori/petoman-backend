// src/consultations/dto/update-consultation.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateConsultationDto } from './create-consultation.dto';
import { IsEnum } from 'class-validator';
import { ConsultationStatus} from "./consultation.entity";

export class UpdateConsultationDto extends PartialType(CreateConsultationDto) {
    @IsEnum(ConsultationStatus)
    status?: ConsultationStatus;
}