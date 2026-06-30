import {BadRequestException, Injectable, Logger} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {Transaction, TransactionStatus, TransactionType} from '../../transaction/transaction.entity';
import {PaymentResult, PaymentService} from "./payment.service";


@Injectable()
export class PaymentReconciliationService {
    private readonly logger = new Logger(PaymentReconciliationService.name);

    constructor(
        private paymentService: PaymentService,
        @InjectRepository(Transaction)
        private txRepo: Repository<Transaction>,
    ) {
    }

    /**
     * متد جدید برای پردازش تک‌تک تراکنش‌های Pending
     */
    async reconcileAllPendingTransactions() {
        this.logger.log('Fetching all pending transactions for reconciliation...');

        // ۱. پیدا کردن تمام تراکنش‌های Pending
        // نکته مهم: فقط تراکنش‌هایی را بگیر که مثلاً ۵ دقیقه قبل Pending شده‌اند
        //const fiveMinutesAgo = new Date();
        //fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

        const pendingTransactions = await this.txRepo.find({
            where: {
                status: TransactionStatus.PENDING,
                /*createdAt: { // فرض بر این است که فیلد createdAt دارید
                    lessThan: fiveMinutesAgo
                }*/
            },
            relations: ['order']
        } as any);

        if (pendingTransactions.length === 0) {
            this.logger.log('No pending transactions found older than 5 minutes.');
            return {totalProcessed: 0, successCount: 0, failedCount: 0};
        }

        this.logger.log(`Found ${pendingTransactions.length} pending transactions.`);

        let successCount = 0;
        let failedCount = 0;

        // ۲. لوپ روی تک‌تک تراکنش‌ها
        for (const tx of pendingTransactions) {
            try {
                this.logger.debug(`Processing transaction: ${tx.id}`);

                // فراخوانی متد برای هر تراکنش
                const result = await this.reconcileTransactionByAuthority(tx.id, tx.gateway || 'zarinpal');
                if (result.success) successCount++;
                this.logger.log(`Successfully reconciled transaction: ${tx.id}`);

            } catch (error) {
                failedCount++;
                this.logger.error(`Failed to reconcile transaction ${tx.id}: ${error.message}`);

                // نکته مهم: اگر خطا از نوعی است که با Retry حل می‌شود (مثل قطعی شبکه)،
                // می‌توانید وضعیت تراکنش را تغییر ندهید تا دفعه بعد Retry شود.
                // اما اگر خطا دائمی است (مثل "پرداخت لغو شد" یا "خطای بانکی")،
                // بهتر است وضعیت را به FAILED تغییر دهید تا در لیست پندینگ نماند.

                // مثال: اگر پیام خطا شامل "لغو" است، وضعیت را فیکس کنید
                /*if (error.message.includes('لغو') || error.message.includes('Cancel')) {
                    await this.txRepo.update(tx.id, {
                        status: TransactionStatus.FAILED,
                        note: 'Payment cancelled by user or bank'
                    } as any);
                    this.logger.warn(`Marked transaction ${tx.id} as FAILED due to cancellation.`);
                }*/

            }
        }

        return {
            totalProcessed: pendingTransactions.length,
            successCount,
            failedCount
        };
    }

    /**
     * نقطه ورود اصلی برای بررسی یک تراکنش خاص
     */
    async reconcileTransactionByAuthority(txId: string, gatewayName: string = 'zarinpal') {
        this.logger.log(`Starting reconciliation for Transaction ID: ${txId}`);
        const tx = await this.txRepo.findOne({
            where: {id: txId},
            relations: ['order'],
        } as any);
        if (!tx) throw new BadRequestException('تراکنش یافت نشد');

        // ✅ اگر تراکنش قبلاً موفق بوده، دیگر کاری نکن
        if (tx.status === TransactionStatus.SUCCESS) {
            this.logger.log(`Transaction ${txId} is already successful. Skipping.`);
            return {success: true};
        }

        // ✅ اگر تراکنش قبلاً ناموفق بوده، دیگر کاری نکن
        if (tx.status === TransactionStatus.FAILED) {
            this.logger.log(`Transaction ${txId} is already failed. Skipping.`);
            return {success: false, reason: 'Already failed'};
        }

        const orderType = tx.metadata?.type;
        let result: PaymentResult

        try {
            if (orderType === TransactionType.VET_CLINIC_ORDER) {
                this.logger.log(`Re-verifying Vet Clinic order for transaction ${txId}`);
                result = await this.paymentService.verifyPaymentForVetClinic(
                    gatewayName,
                    {Status: 'OK', Authority: tx.authority}, // ارسال Authority برای استعلام دقیق‌تر
                    txId,
                );
            } else if (orderType === TransactionType.MARKET_ORDER) {
                result = await this.paymentService.verifyPaymentForMarketOrder(
                    gatewayName,
                    {Status: 'OK', Authority: tx.authority},
                    txId,
                );
            } else if (orderType === TransactionType.PHARMACY_ORDER) {

                let authority: string | undefined

                if (tx.metadata?.authorityRemaining) {
                    authority = tx.metadata.authorityRemaining
                } else {
                    authority = tx.authority
                }

                result = await this.paymentService.verifyPaymentForPharmacyOrder(
                    gatewayName,
                    {Status: 'OK', Authority: authority},
                    txId,
                );
            } else if (orderType === TransactionType.WALLET_CHARGE) {
                this.logger.warn('Wallet reconciliation logic needs to be implemented separately.');
                return {success: false, reason: 'Wallet reconciliation not implemented'};
            } else {
                this.logger.warn(`Unknown transaction type: ${orderType}`);
                return {success: false, reason: 'Unknown type'};
            }

            this.logger.log(`Reconciliation successful for Transaction ID: ${txId}`);
            return {success: result.success};
        } catch (error) {
            this.logger.error(`Error during finalization for tx ${txId}: ${error.message}`);

            // ✅ اصلاح اصلی: تشخیص نوع خطا برای Retry یا Fail
            const errorMessage = error.message.toLowerCase();

            // اگر خطا نشان‌دهنده این باشد که پرداخت در درگاه ناموفق بوده (لغو شده، خطای بانکی، و غیره)
            // باید وضعیت را FAILED کنیم و Retry نکنیم.
            if (errorMessage.includes('لغو') ||
                errorMessage.includes('cancel') ||
                errorMessage.includes('خطای بانکی') ||
                errorMessage.includes('bank error') ||
                errorMessage.includes('not verified') ||
                errorMessage.includes('payment failed')) {

                this.logger.warn(`Transaction ${txId} failed in gateway. Marking as FAILED.`);
                await this.txRepo.update(txId, {
                    status: TransactionStatus.FAILED,
                    //note: 'Payment cancelled or failed in gateway during reconciliation'
                } as any);

                // همچنین وضعیت سفارش را به لغو شده تغییر دهید (در صورت نیاز)
                // await this.orderRepo.update(tx.order.id, { status: OrderStatus.CUSTOMER_CANCELLED });

                return {success: true, reason: 'Marked as failed due to gateway error'};
            }

            // اگر خطا از نوعی باشد که قابل حل نیست (مثلاً خطای دیتابیس، خطای شبکه موقت، نبودن کیف پول، و غیره)
            // باید Retry شود. برای این کار باید خطا را پرتاب کنیم تا Bull بفهمد Job شکست خورده.
            throw error; // این خطا باعث می‌شود Bull Job را به عنوان Failed ثبت کند و Retry کند
        }
    }
}