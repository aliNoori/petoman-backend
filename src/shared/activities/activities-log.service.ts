import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog} from "./activity-log.entity";
import { CreateActivityLogDto} from "./create-activity-log.dto";

@Injectable()
export class ActivitiesLogService {
    constructor(
        @InjectRepository(ActivityLog)
        private readonly activityLogRepository: Repository<ActivityLog>,
    ) {}

    async createLog(dto: CreateActivityLogDto) {
        const log = this.activityLogRepository.create(dto);
        return await this.activityLogRepository.save(log);
    }

    async findAll(limit: number = 20) {
        return this.activityLogRepository.find({
            order: { createdAt: 'DESC' },
            take: limit,
            relations: ['user'], // اگر نیاز به اطلاعات کاربر دارید
        } as any);
    }
}