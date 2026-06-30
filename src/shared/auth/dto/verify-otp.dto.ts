import {IsBoolean, IsNotEmpty, IsOptional, IsString, Length} from 'class-validator';

export class VerifyOtpDto {
    @IsString()
    @IsNotEmpty({ message: 'شماره تلفن الزامی است' })
    phoneNumber: string;

    @IsString()
    @IsNotEmpty({ message: 'کد تایید الزامی است' })
    @Length(4, 6, { message: 'کد تایید باید بین 4 تا 6 رقم باشد' })
    code: string;

    @IsBoolean()
    @IsOptional()
    isVerifiedPhone?: boolean;
}
