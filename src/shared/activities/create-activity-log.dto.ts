import { IsEnum, IsString, IsOptional, IsObject } from 'class-validator';
import { ActivityEntityType, ActivityAction} from "./activity-log.entity";

export class CreateActivityLogDto {
    @IsString()
    userId: string;

    @IsString()
    @IsOptional()
    actorName?: string;

    @IsEnum(ActivityEntityType)
    entityType: ActivityEntityType;

    @IsString()
    entityId: string;

    @IsEnum(ActivityAction)
    action: ActivityAction;

    @IsString()
    title: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsObject()
    @IsOptional()
    metadata?: Record<string, any>;

    @IsString()
    @IsOptional()
    ipAddress?: string;
}