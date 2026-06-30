import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
    @IsString()
    @IsNotEmpty({ message: 'رفرش توکن الزامی است' })
    refreshToken: string;
}