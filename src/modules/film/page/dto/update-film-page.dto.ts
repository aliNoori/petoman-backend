import { PartialType } from '@nestjs/mapped-types';
import { CreateFilmPageDto } from './create-film-page.dto';
import {IsBoolean, IsOptional} from "class-validator";
import {Transform} from "class-transformer";

export class UpdateFilmPageDto extends PartialType(CreateFilmPageDto) {

    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    showInMenu?: boolean;

    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    commentsEnabled?: boolean;
}
