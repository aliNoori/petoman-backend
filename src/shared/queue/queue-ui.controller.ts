import { Controller, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { INestApplication } from '@nestjs/common';

let app: INestApplication;

export const setQueueUiApp = (nestApp: INestApplication) => {
    app = nestApp;
};

@Controller('admin')
export class QueueUiController implements OnModuleInit {
    constructor(
        @InjectQueue('send-sms') private smsQueue: Queue,
        @InjectQueue('wallet-settlement') private settlementQueue: Queue,
        @InjectQueue('notifications') private notificationQueue: Queue,
        @InjectQueue("cleanup") private readonly cleanupQueue: Queue,
        @InjectQueue('payment-reconciliation') private readonly reconciliationQueue: Queue,
    ) {}

    async onModuleInit() {
        if (!app) return;

        const serverAdapter = new ExpressAdapter();
        serverAdapter.setBasePath('/admin/queues');

        createBullBoard({
            queues: [
                new BullAdapter(this.smsQueue),
                new BullAdapter(this.notificationQueue),
                new BullAdapter(this.settlementQueue),
                new BullAdapter(this.cleanupQueue),
                new BullAdapter(this.reconciliationQueue)
            ],
            serverAdapter,
        });

        const expressApp = app.getHttpAdapter().getInstance();
        expressApp.use('/admin/queues', serverAdapter.getRouter());
    }
}