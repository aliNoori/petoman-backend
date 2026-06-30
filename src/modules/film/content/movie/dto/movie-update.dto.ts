import { PartialType } from '@nestjs/mapped-types';
import { CreateMovieDto} from "./movie-create.dto";
import { IsOptional, IsString, IsArray } from 'class-validator';

export class UpdateMovieDto extends PartialType(CreateMovieDto) {

    @IsOptional()
    @IsString()
    country?: string;

    @IsOptional()
    @IsString()
    language?: string;

    @IsOptional()
    @IsString()
    ageRating?: string;

    @IsOptional()
    @IsString()
    keywords?: string;
}
