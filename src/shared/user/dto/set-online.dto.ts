import {IsBoolean, IsUUID} from "class-validator";

export class SetOnlineDto {
    @IsUUID()
    userId: string;

    @IsBoolean()
    isOnline: boolean;
}
