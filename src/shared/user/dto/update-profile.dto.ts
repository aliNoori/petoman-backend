import { IsOptional, IsString, IsEmail } from 'class-validator';

export class UpdateProfileDto {
    @IsOptional()
    @IsString({ message: 'نام باید رشته باشد' })
    firstName?: string;

    @IsOptional()
    @IsString({ message: 'نام خانوادگی باید رشته باشد' })
    lastName?: string;

    @IsOptional()
    @IsEmail({}, { message: 'ایمیل معتبر نیست' })
    email?: string;

    @IsOptional()
    @IsString({ message: 'شماره تلفن باید رشته باشد' })
    phoneNumber?: string;

    @IsOptional()
    @IsString({ message: 'آدرس تصویر باید رشته باشد' })
    avatar?: string;
}
