import { NotificationType } from '../notification.entity';
import {ApiProperty, ApiPropertyOptional} from "@nestjs/swagger";
import {IsNotEmpty, IsOptional, IsString} from "class-validator";

export class CreateNotificationDto {
    @ApiPropertyOptional({ example: 'user-123', description: 'شناسه کاربر دریافت‌کننده نوتیفیکیشن' })
    @IsOptional()
    @IsString()
    userId?: string;

    @ApiProperty({ example: NotificationType.EMAIL, description: 'نوع نوتیفیکیشن', enum: NotificationType })
    type: NotificationType;

    @ApiProperty({ example: 'پرداخت موفق', description: 'عنوان نوتیفیکیشن' })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({ example: 'پرداخت شما با موفقیت انجام شد.', description: 'متن پیام نوتیفیکیشن' })
    @IsString()
    @IsNotEmpty()
    message: string;

    @ApiPropertyOptional({ example: 'ti ti-coin text-rose-600', description: 'کلاس آیکون برای نمایش' })
    @IsOptional()
    @IsString()
    icon?: string;

    @ApiPropertyOptional({ example: 'bg-rose-100', description: 'رنگ پس‌زمینه نوتیفیکیشن' })
    @IsOptional()
    @IsString()
    color?: string;

    @ApiPropertyOptional({ example: 'hamian', description: 'نوع پنل' })
    @IsString()
    panelType:string

    @ApiPropertyOptional({ example: 'success', description: 'وضعیت موفق' })
    @IsOptional()
    @IsString()
    statusLabel?: string;
}