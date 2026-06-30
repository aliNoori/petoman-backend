import {PartialType, OmitType, ApiPropertyOptional} from '@nestjs/swagger';
import { CreateAdminDto } from './create-admin.dto';
import {IsString, MinLength} from "class-validator";

export class UpdateAdminDto extends PartialType(
    OmitType(CreateAdminDto, ['password'] as const)
) {
    // پسورد اختیاری است و جداگانه هندل می‌شود
    @ApiPropertyOptional({ example: 'newpassword123' })
    @IsString()
    @MinLength(6)
    password?: string;
}