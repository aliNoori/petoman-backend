import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { NotificationService } from "../notification/notification.service";
import {NotificationType} from "../notification/notification.entity";

@Processor('notifications')
export class NotificationProcessor {
    private readonly logger = new Logger(NotificationProcessor.name);

    constructor(
        private readonly notifService: NotificationService,
    ) {}

    @Process('handle-notification')
    async handleNotification(job: Job<{
        userId: string;
        type: NotificationType;
        title: string;
        message: string;
        icon: string;
        color: string;
        panelType: string;
        data?: any;
    }>) {
        this.logger.debug(`Processing notification for user: ${job.data.userId}`);

        const { userId, type, title, message, icon, color, panelType, data } = job.data;

        try {
            // ۱. ذخیره در دیتابیس
            await this.notifService.create({
                userId,
                type: type,
                title,
                message,
                icon,
                color,
                panelType,
            });

            this.logger.log(`Notification sent to user ${userId}: ${title}`);
            return { success: true, userId };
        } catch (error) {
            this.logger.error(`Failed to send notification to user ${userId}:`, error);
            throw error;
        }
    }

    @OnQueueActive()
    onActive(job: Job) {
        this.logger.debug(`Processing job ${job.id} of type ${job.name}`);
    }

    @OnQueueCompleted()
    onCompleted(job: Job, result: any) {
        this.logger.debug(`Completed job ${job.id} with result: ${JSON.stringify(result)}`);
    }

    @OnQueueFailed()
    onFailed(job: Job, error: Error) {
        this.logger.error(`Failed job ${job.id}: ${error.message}`);
    }
}