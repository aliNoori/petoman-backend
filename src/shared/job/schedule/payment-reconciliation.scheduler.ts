// payment-reconciliation-scheduler.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, Timeout } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class PaymentReconciliationScheduler {
    private readonly logger = new Logger(PaymentReconciliationScheduler.name);

    constructor(
        @InjectQueue('payment-reconciliation')
        private readonly reconciliationQueue: Queue,
    ) {}

    // این متد هر ۵ ساعت اجرا می‌شود
    @Cron('0 */5 * * *') // هر ۵ دقیقه//@Cron('*/5 * * * *')
    async handleCron() {
        this.logger.log('Running scheduled reconciliation for pending transactions...');

        try {
            await this.reconciliationQueue.add('check-pending-transactions', {}, {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 10000
                },
                // اگر تعداد تراکنش‌ها زیاد است، می‌توانید timeout را افزایش دهید
                timeout: 60000 // 60 ثانیه
            });
            this.logger.log('Reconciliation job added to queue.');
        } catch (error) {
            this.logger.error('Failed to add reconciliation job to queue:', error);
        }
    }

    // برای تست اولیه، می‌توانید این را نگه دارید، اما Cron اصلی را فعال کنید
    @Timeout(1000)
    async handleInitialDelay() {
        this.logger.log('Initial reconciliation trigger after 1 second.');
        await this.reconciliationQueue.add('check-pending-transactions', {});
    }
}