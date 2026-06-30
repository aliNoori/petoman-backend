import { Module, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { QueueUiController } from './queue-ui.controller';
import { QueuesModule } from './queues.module'; // ایمپورت ماژول مرکزی

@Module({
    imports: [
        QueuesModule, // <--- صف‌ها از اینجا تامین می‌شوند
    ],
    controllers: [QueueUiController],
})
export class QueueUiModule implements OnModuleInit {
    constructor(
        @InjectQueue('send-sms') private smsQueue: Queue,
        @InjectQueue('wallet-settlement') private settlementQueue: Queue,
        @InjectQueue('notifications') private notificationQueue: Queue,
        @InjectQueue("cleanup") private readonly cleanupQueue: Queue,
        @InjectQueue('payment-reconciliation') private readonly reconciliationQueue: Queue,
    ) {}

    async onModuleInit() {
        // متد onModuleInit خالی بماند یا لاگ بگذارید، منطق UI در کنترلر است
        console.log('Queue UI Module Initialized');
    }
}