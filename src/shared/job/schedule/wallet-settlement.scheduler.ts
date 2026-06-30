import { Injectable, Logger } from '@nestjs/common';
import {Cron, CronExpression, Timeout} from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class WalletSettlementScheduler {
    private readonly logger = new Logger(WalletSettlementScheduler.name);

    constructor(
        @InjectQueue('wallet-settlement') private readonly settlementQueue: Queue,
    ) {}

    // این متد هر شب ساعت ۱۲ اجرا می‌شود
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleCron() {
        this.logger.log('ارسال درخواست تسویه حساب به صف...');

        // اضافه کردن Job به صف
        await this.settlementQueue.add('settle-pending-transactions', {}, {
            attempts: 3, // تلاش مجدد در صورت خطا
            timeout: 30000, // تایم‌اوت ۳۰ ثانیه
        });

        this.logger.log('درخواست تسویه حساب به صف اضافه شد.');
    }
    // این متد ۵ دقیقه بعد از بالا آمدن سرویس اجرا می‌شود
    // ۵ دقیقه = ۳۰۰,۰۰۰ میلی‌ثانیه
    /*@Timeout(1000)
    async handleInitialDelay() {
        this.logger.log('گذشت ۵ دقیقه از شروع سرویس. اجرای تسویه حساب...');
        await this.settlementQueue.add('settle-pending-transactions', {}, {
            attempts: 3,
            timeout: 30000,
        });
    }*/
}