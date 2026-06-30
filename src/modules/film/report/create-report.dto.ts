import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator'

export enum ReportTypeEnum {
    VIDEO = 'video',
    AUDIO = 'audio',
    SUBTITLE = 'subtitle',
    QUALITY = 'quality',
    OTHER = 'other',
}

export enum MediaTypeEnum {
    MOVIE = 'movie',
    EPISODE = 'episode',
    SERIES = 'series',
}

export class CreateReportDto {
    @IsEnum(ReportTypeEnum)
    problemType: ReportTypeEnum

    @IsString()
    @IsNotEmpty()
    description: string

    @IsUUID()
    mediaId: string

    @IsEnum(MediaTypeEnum)
    mediaType: MediaTypeEnum
}