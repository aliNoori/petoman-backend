import { PartialType } from '@nestjs/mapped-types';
import {CreateFilmPostDto} from "./create-film-post.dto";
import {IsBoolean, IsOptional} from "class-validator";
import {Transform} from "class-transformer";

export class UpdateFilmPostDto extends PartialType(CreateFilmPostDto) {

    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    commentsEnabled?: boolean;
}
