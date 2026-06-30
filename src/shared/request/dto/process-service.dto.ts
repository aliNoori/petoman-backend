// src/admin/dto/process-service.dto.ts
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ProcessServiceDto {
    @IsBoolean()
    isApproved: boolean;

    @IsOptional()
    @IsString()
    reason?: string;
}