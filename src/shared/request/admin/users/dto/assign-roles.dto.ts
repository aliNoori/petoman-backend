import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class AssignRolesDto {
    @ApiProperty({ example: ['1', '3'], type: [String] })
    @IsArray()
    @IsString({ each: true })
    roleIds: string[];
}