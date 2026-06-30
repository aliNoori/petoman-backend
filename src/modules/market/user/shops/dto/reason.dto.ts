import {ApiProperty} from "@nestjs/swagger";
import {IsString} from "class-validator";

export class ReasonDto {
    @ApiProperty({ example: 'مدارک شما ناقص است' })
    @IsString()
    reason: string;
}