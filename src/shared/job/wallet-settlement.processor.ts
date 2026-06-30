import {Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed, InjectQueue} from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import {Job, Queue} from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import {Repository, DataSource, In} from 'typeorm';
import { WalletTransaction} from "../wallet/wallet-transaction.entity";
import {Wallet, WalletType} from "../wallet/wallet.entity";
import { WalletTransactionType} from "../wallet/wallet-transaction.entity";

// نام صف را wallet-settlement می‌گذاریم
@Processor('wallet-settlement')
export class WalletSettlementProcessor {
    private readonly logger = new Logger(WalletSettlementProcessor.name);

    constructor(
        @InjectQueue('send-sms') private smsQueue: Queue,
        @InjectRepository(WalletTransaction)
        private readonly txRepo: Repository<WalletTransaction>,
        @InjectRepository(Wallet)
        private readonly walletRepo: Repository<Wallet>,
        private readonly dataSource: DataSource, // برای مدیریت تراکنش‌ها
    ) {}

    @Process('settle-pending-transactions')
    async handleSettlement(job: Job) {
        this.logger.log('--- شروع فرآیند تسویه حساب کیف پول ---');

        try {
            await this.dataSource.transaction(async (manager) => {
                const now = new Date();

                // فقط تراکنش‌های Pending که موعدشون رسیده
                const pendingTransactions = await manager
                    .createQueryBuilder(WalletTransaction, 'tx')
                    .innerJoinAndSelect('tx.wallet', 'wallet')
                    .innerJoinAndSelect('wallet.user', 'user')
                    .where('tx.type IN (:...types)', { types: [WalletTransactionType.PENDING_CREDIT, WalletTransactionType.PENDING_FEE] })
                    //.andWhere('tx.releaseAt <= :now', { now })
                    .setLock('pessimistic_write')
                    .getMany();
                console.log('pendingTransactions.length',pendingTransactions.length)
                if (!pendingTransactions.length) return;

                // 🏦 دریافت ولت PLATFORM_BANK
                const platformBankWallet = await manager.findOne(Wallet, {
                    where: { type: WalletType.PLATFORM_BANK },
                    lock: { mode: 'pessimistic_write' },
                } as any);

                if (!platformBankWallet) throw new Error('Platform Bank Wallet not found');

                for (const tx of pendingTransactions) {

                    let metadataObj = {};
                    if (tx.metadata) {
                        try {
                            metadataObj = tx.metadata;
                        } catch (e) {
                            this.logger.warn(`خطا در پارس کردن metadata برای تراکنش ${tx.id}`);
                        }
                    }

                    // --- چک نهایی برای اطمینان از لغو نشدن ---
                    // گاهی اوقات بین لحظه Select و پردازش، تراکنش لغو می‌شود.
                    const isCancelled = tx.metadata?.cancelled;
                    if (isCancelled) {
                        this.logger.log(`تراکنش ${tx.id} لغو شده است. از تسویه صرف‌نظر می‌شود.`);
                        // اختیاری: می‌توانید وضعیت تراکنش را به CANCELLED تغییر دهید تا در دیتابیس باقی بماند
                        tx.type = WalletTransactionType.CANCELLED; // یک نوع جدید برای لغو
                        await manager.save(WalletTransaction, tx);
                        continue; // به تراکنش بعدی برو
                    }

                    // ب) چک کردن وجود تراکنش لغو (Refund) برای این سفارش
                    // اگر در طول فرآیند لغو، تراکنش‌های CANCEL_CREDIT یا CANCEL_FEE ثبت شده باشند
                    const cancelledTx = await manager.findOne(WalletTransaction, {
                        where: {
                            referenceId: tx.referenceId, // شناسه سفارش
                            type: In([WalletTransactionType.CANCEL_CREDIT, WalletTransactionType.CANCEL_FEE]) // تایپ‌های جدید برای لغو
                        }
                    });

                    if (cancelledTx) {
                        this.logger.log(`تراکنش ${tx.id} مربوط به سفارش ${tx.referenceId} لغو شده است. رد می‌شود.`);
                        // آپدیت نوع تراکنش به CANCELLED تا در گزارش‌ها دیده شود
                        tx.type = WalletTransactionType.CANCELLED;
                        await manager.save(WalletTransaction, tx);
                        continue; // از واریز صرف‌نظر می‌کنیم
                    }

                    const amount = Number(tx.amount);

                    // 🔹 کم کردن از PLATFORM_BANK
                    await manager
                        .createQueryBuilder()
                        .update(Wallet)
                        .set({
                            balance: () => `balance - ${amount}`,
                        })
                        .where('id = :id', { id: platformBankWallet.id })
                        .execute();

                    // 🔹 اضافه کردن به ولت مقصد
                    const wallet = await manager.findOne(Wallet, {
                        where: { id: tx.wallet.id },
                        lock: { mode: 'pessimistic_write' },
                    } as any);
                    if (!wallet) continue;

                    await manager
                        .createQueryBuilder()
                        .update(Wallet)
                        .set({
                            balance: () => `balance + ${amount}`,
                        })
                        .where('id = :id', { id: wallet.id })
                        .execute();

                    // 🔹 تبدیل نوع تراکنش
                    tx.type =
                        tx.type === WalletTransactionType.PENDING_CREDIT
                            ? WalletTransactionType.CREDIT
                            : WalletTransactionType.FEE_INCOME;

                    await manager.save(tx);

                    // 🔹 ارسال SMS بعد از موفقیت
                    if (tx.wallet.user?.phoneNumber) {
                        await this.smsQueue.add('handle-send-sms', {
                            phoneNumber: tx.wallet.user.phoneNumber,
                            message: `تسویه تراکنش #${tx.id} | مبلغ ${amount}`,
                        });
                    }

                    this.logger.log(`تسویه امن تراکنش ${tx.id} انجام شد`);
                }
            });

            this.logger.log('--- پایان موفق فرآیند تسویه حساب ---');
            return { status: 'completed' };

        } catch (error) {
            this.logger.error('خطا در فرآیند تسویه حساب:', error.stack);
            throw error;
        }
    }


    @OnQueueActive()
    onActive(job: Job) {
        this.logger.debug(`در حال پردازش Job تسویه حساب ${job.id}`);
    }

    @OnQueueCompleted()
    onCompleted(job: Job, result: any) {
        this.logger.debug(`Job تسویه حساب ${job.id} تکمیل شد.`);
    }

    @OnQueueFailed()
    onFailed(job: Job, err: Error) {
        this.logger.error(`Job تسویه حساب ${job.id} با شکست مواجه شد: ${err.message}`);
    }
}