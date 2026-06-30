import {IsNotEmpty, IsOptional, IsString, Length} from 'class-validator';

export class CheckUserDto {
    @IsString()
    @IsNotEmpty({ message: 'شماره تلفن الزامی است' })
    phoneNumber: string;

    @IsString()
    @IsNotEmpty({ message: 'کد تایید الزامی است' })
    @Length(4, 6, { message: 'کد تایید باید بین 4 تا 6 رقم باشد' })
    code: string;

    @IsString()
    @IsOptional()
    shopId?: string;
}
