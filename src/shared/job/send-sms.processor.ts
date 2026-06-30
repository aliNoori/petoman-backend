import { Processor, Process, OnQueueActive, OnQueueCompleted } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import {NotificationService} from "../notification/notification.service";
import {SmsService} from "../gateways/sms/sms.service";
import {NotificationType} from "../notification/notification.entity";

// نام صف باید دقیقاً همان چیزی باشد که در مرحله قبل تعریف کردید
@Processor('send-sms')
export class SendSmsProcessor {
    private readonly logger = new Logger(SendSmsProcessor.name);

    constructor(
        // سرویس‌های مورد نیاز را اینجا اینجکت کنید
        private notifService: NotificationService,
        private readonly smsService: SmsService,
    ) {}

    // نام وظیفه (job name) را اینجا تعریف می‌کنیم
    @Process('handle-send-sms')
    async handleShopRequest(job: Job) {
        const { phoneNumber,message } = job.data;

        this.logger.log(`Processing request for user: ${phoneNumber}`);

        // ۲. ارسال پیامک
        //await this.smsService.send(phoneNumber,message);//TODO:disable for test

        this.logger.log(`Notification and SMS sent for user: ${phoneNumber}`);

        return { status: 'completed' };
    }

    @OnQueueActive()
    onActive(job: Job) {
        this.logger.debug(`Processing job ${job.id} of type ${job.name}`);
    }

    @OnQueueCompleted()
    onCompleted(job: Job, result: any) {
        this.logger.debug(`Completed job ${job.id} with result: ${result}`);
    }
}