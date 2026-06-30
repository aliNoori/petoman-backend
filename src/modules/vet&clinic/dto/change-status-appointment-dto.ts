import {
    IsString,
    IsOptional,
    IsDateString,
    IsNotEmpty
} from 'class-validator';

export class ChangeAppointmentStatusDto {
    /**
     * وضعیت نوبت
     * باید یکی از مقادیر مجاز باشد
     */
    @IsString()
    @IsNotEmpty({ message: 'وضعیت نمی‌تواند خالی باشد' })
    status: string;

    /**
     * دلیل لغو نوبت (فقط در صورت لغو الزامی است)
     */
    @IsOptional()
    @IsString()
    reason?: string;

    /**
     * مدت زمان جلسه به دقیقه
     * فقط باید عدد باشد و کمتر از ۱۰۰۰ دقیقه
     */
    @IsOptional()
    @IsString()
    duration?: string;

    /**
     * تاریخ و زمان شروع نوبت
     * باید فرمت استاندارد ISO باشد
     */
    @IsOptional()
    @IsDateString({}, { message: 'فرمت تاریخ نامعتبر است' })
    appointmentDate?: Date;

    @IsOptional()
    @IsDateString({}, { message: 'فرمت تاریخ نامعتبر است' })
    completedAt?: Date;
}