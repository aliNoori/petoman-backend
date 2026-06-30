import { IsNotEmpty, IsString, Validate } from 'class-validator';
import { TypeValidator } from './type.validator';

export class SettingDto {
    @IsString()
    @IsNotEmpty()
    key: string;

    @Validate(TypeValidator)
    value: any;
}