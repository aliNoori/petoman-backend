import {
    IsString,
    IsEnum,
    IsOptional,
    IsNotEmpty,
    IsBooleanString,
    IsDateString,
    IsNumberString,
    MaxLength, Min, ValidateIf,
} from 'class-validator'
import { KindnessType, KindnessStatus, TimerType } from '../kindness-meeting.entity'
import {ApiProperty, ApiPropertyOptional} from "@nestjs/swagger";

export class CreateKindnessMeetingDto {
    @ApiProperty({ example: KindnessType.FINANCIAL, description: 'نوع مهربانی', enum: KindnessType })
    @IsEnum(KindnessType)
    type: KindnessType;

    @ApiPropertyOptional({ example: 'https://example.com/image.png', description: 'تصویر مربوط به جلسه' })
    @IsOptional()
    @IsString()
    image?: string;

    @ApiProperty({ example: 'کمک به ساخت مدرسه', description: 'عنوان جلسه مهربانی (حداکثر ۱۵۰ کاراکتر)' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    title: string;

    @ApiProperty({ example: 'این جلسه برای جمع‌آوری کمک مالی جهت ساخت مدرسه برگزار می‌شود.', description: 'توضیحات جلسه مهربانی' })
    @IsString()
    @IsNotEmpty()
    description: string;

    // مالی
    @ApiPropertyOptional({ example: '1000000', description: 'هدف مالی (فقط برای نوع مالی)', type: String })
    @ValidateIf((o) => o.type === KindnessType.FINANCIAL)
    @IsNumberString()
    goal: string;

    @ApiPropertyOptional({ example: '250000', description: 'مبلغ فعلی جمع‌آوری شده' })
    @IsOptional()
    @IsNumberString()
    current?: string;

    @ApiPropertyOptional({ example: '2025-12-05', description: 'تاریخ شروع (فقط برای نوع مالی)', type: String, format: 'date' })
    @ValidateIf((o) => o.type === KindnessType.FINANCIAL)
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({ example: '09:00', description: 'ساعت شروع' })
    @IsOptional()
    @IsString()
    startTime?: string;

    @ApiPropertyOptional({ example: '2025-12-20', description: 'تاریخ پایان (فقط برای نوع مالی)', type: String, format: 'date' })
    @ValidateIf((o) => o.type === KindnessType.FINANCIAL)
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional({ example: '18:00', description: 'ساعت پایان' })
    @IsOptional()
    @IsString()
    endTime?: string;

    // داوطلبانه
    @ApiPropertyOptional({ example: 'تهران، خیابان آزادی', description: 'محل برگزاری (فقط برای نوع داوطلبانه)' })
    @ValidateIf((o) => o.type === KindnessType.VOLUNTEER)
    @IsString()
    @IsNotEmpty()
    location: string;

    @ApiPropertyOptional({ example: '2025-12-10', description: 'تاریخ رویداد (فقط برای نوع داوطلبانه)', type: String, format: 'date' })
    @ValidateIf((o) => o.type === KindnessType.VOLUNTEER)
    @IsDateString()
    eventDate: string;

    @ApiPropertyOptional({ example: '15:00', description: 'ساعت رویداد' })
    @IsOptional()
    @IsString()
    eventTime?: string;

    // عمومی
    @ApiProperty({ example: 'علی رضایی', description: 'مدیر جلسه (حداکثر ۱۰۰ کاراکتر)' })
    @IsString()
    @MaxLength(100)
    manager: string;

    @ApiPropertyOptional({ example: KindnessStatus.ACTIVE, description: 'وضعیت جلسه', enum: KindnessStatus })
    @IsOptional()
    @IsEnum(KindnessStatus)
    status?: KindnessStatus;

    @ApiProperty({ example: 'category-123', description: 'شناسه دسته‌بندی جلسه' })
    @IsString()
    @IsNotEmpty()
    categoryId: string;

    @ApiPropertyOptional({ example: 'true', description: 'نمایش در صفحه اصلی' })
    @IsOptional()
    @IsBooleanString()
    showOnHomepage?: string;

    // تایمر
    @ApiPropertyOptional({ example: 'true', description: 'نمایش تایمر' })
    @IsOptional()
    @IsBooleanString()
    showTimer?: string;

    @ApiPropertyOptional({ example: TimerType.COUNTDOWN, description: 'نوع تایمر', enum: TimerType })
    @ValidateIf((o) => o.showTimer === 'true')
    @IsEnum(TimerType)
    timerType: TimerType;

    @ApiPropertyOptional({ example: 'true', description: 'هشدار تایمر' })
    @IsOptional()
    @IsBooleanString()
    timerAlert?: string;

    @ApiPropertyOptional({ example: '3', description: 'تعداد روزهای هشدار قبل از پایان', type: String })
    @ValidateIf((o) => o.showTimer === 'true' && o.timerAlert === 'true')
    @IsNumberString()
    alertDays: string;
}