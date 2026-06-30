import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateTimeOffDto {
    @IsNotEmpty()
    @IsString()
    date: string; // "2026-03-10"

    @IsNotEmpty()
    @IsString()
    startTime: string; // "14:30"

    @IsNotEmpty()
    @IsString()
    endTime: string; // "15:30"

    @IsOptional()
    @IsString()
    note?: string;
}