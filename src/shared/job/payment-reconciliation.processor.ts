// payment-reconciliation.processor.ts
import { OnQueueActive, OnQueueCompleted, OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PaymentReconciliationService } from '../gateways/payments/payment-reconciliation.service';

@Processor('payment-reconciliation')
export class PaymentReconciliationProcessor {
    private readonly logger = new Logger(PaymentReconciliationProcessor.name);

    constructor(
        private readonly reconciliationService: PaymentReconciliationService,
    ) {}

    @Process('check-pending-transactions')
    async checkPendingTransactions(job: Job) {
        this.logger.log(`Starting batch reconciliation for pending transactions (Job ID: ${job.id})`);

        try {
            // فراخوانی متد که تمام پندینگ‌ها را پردازش می‌کند
            const result = await this.reconciliationService.reconcileAllPendingTransactions();

            this.logger.log(`Batch reconciliation completed. Total processed: ${result.totalProcessed}, Success: ${result.successCount}, Failed: ${result.failedCount}`);
            return result;

        } catch (error) {
            // اگر خطایی در سطح Job رخ داد (مثلاً دیتابیس قطع است)، آن را پرتاب کنید
            // تا Bull آن را به عنوان شکست ثبت کند و Retry کند.
            this.logger.error(`Batch reconciliation failed critically: ${error.message}`);
            throw error;
        }
    }

    @OnQueueActive()
    onActive(job: Job) {
        this.logger.debug(`Processing job ${job.id} of type ${job.name}`);
    }

    @OnQueueCompleted()
    onCompleted(job: Job, result: any) {
        this.logger.debug(`Completed job ${job.id}`);
    }

    @OnQueueFailed()
    onFailed(job: Job, error: Error) {
        this.logger.error(`Failed job ${job.id}: ${error.message}`);
    }
}