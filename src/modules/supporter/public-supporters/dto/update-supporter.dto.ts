import { PartialType } from '@nestjs/mapped-types';
import { CreateSupporterDto } from './create-supporter.dto';
import {IsEmail, IsOptional, IsString} from "class-validator";

export class UpdateSupporterDto extends PartialType(CreateSupporterDto) {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsEmail()
    email?: string

    @IsOptional()
    @IsString()
    phone?: string;
}
