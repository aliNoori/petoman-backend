import {ApiProperty} from "@nestjs/swagger";
import {IsString} from "class-validator";

export class AdminReasonDto {
    @ApiProperty({ example: 'مدارک شما ناقص است' })
    @IsString()
    reason: string;
}