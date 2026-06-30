import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsBoolean, IsOptional, IsNumber, IsArray, IsInt, Min, IsNotEmpty } from "class-validator";

export class TimeSlotsDto {
    @ApiProperty({ example: 1, description: "شناسه بازه زمانی" })
    @IsInt()
    @Min(1)
    id: number;

    @ApiProperty({ example: "ساعت ۹ تا ۱۲", description: "متن نمایشی بازه زمانی" })
    @IsString()
    @IsNotEmpty()
    time: string;

    @ApiProperty({ example: true, description: "وضعیت فعال بودن بازه" })
    @IsBoolean()
    available: boolean;

    @ApiPropertyOptional({ example: 40000, description: "قیمت تحویل برای این بازه (اختیاری، پیش‌فرض 0 است)" })
    @IsNumber()
    @IsOptional()
    @Min(0)
    price?: number;
}

export class UpdateTimeSlotsDto {
    @ApiProperty({ type: [TimeSlotsDto], description: "آرایه‌ای از بازه‌های زمانی" })
    @IsArray()
    timeSlots: TimeSlotsDto[];
}