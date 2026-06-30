import {
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsPhoneNumber,
    IsString,
    IsInt,
} from 'class-validator'
import { HelpType} from "./kindness-meeting-registration.entity";

export class CreateKindnessMeetingRegistrationDto {
    @IsString()
    @IsNotEmpty()
    fullName: string

    @IsPhoneNumber('IR')
    phone: string

    @IsEnum(HelpType)
    helpType: HelpType

    @IsOptional()
    @IsInt()
    amount?: number

    @IsOptional()
    @IsString()
    message?: string
}