import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsString, IsIn } from "class-validator";

export class UpdateNotificationDto {
    @ApiProperty({ example: 'orderNotifications' })
    @IsString()
    @IsIn(['orderNotifications',
        'appointmentTimeNotifications',
        'vaccinationNotifications',
        'smsAppointmentNotifications',
        'discountNotifications',
        'smsNotifications',
        'newsletter'])
    field: string;

    @ApiProperty({ example: true })
    @IsBoolean()
    enabled: boolean;
}