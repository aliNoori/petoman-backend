import { PartialType } from '@nestjs/mapped-types';
import { CreateRequestSupporterDto } from './create-request-supporter.dto';
import {IsEmail, IsOptional, IsString} from "class-validator";

export class UpdateRequestSupporterDto extends PartialType(CreateRequestSupporterDto) {
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
