// src/consultations/dto/create-consultation.dto.ts
import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateConsultationDto {
    @IsNumber()
    @IsNotEmpty()
    doctorId: string;
}