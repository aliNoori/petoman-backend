import { IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyExamCodeDto {
    @IsString()
    @IsNotEmpty()
    @Length(8, 8, { message: 'کد معاینه باید ۸ کاراکتر باشد' })
    examCode: string;
}