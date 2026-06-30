import { Injectable, Logger } from '@nestjs/common'

import axios, { AxiosError } from 'axios';
import { PaymentGateway } from './payment-gateway.interface'

@Injectable()
export class ZarinpalGateway implements PaymentGateway {
    readonly name = 'zarinpal'
    private readonly logger = new Logger(ZarinpalGateway.name)

    private readonly merchantId: string
    private readonly callbackUrl:string
    private readonly sandbox: boolean

    constructor() {

        this.merchantId = process.env.ZARINPAL_MERCHANT_ID!
        this.sandbox = process.env.ZARINPAL_SANDBOX === 'true'
        this.callbackUrl=process.env.PAYMENT_CALLBACK_URL!
    }

    private getRequestUrl() {
        return this.sandbox
            ? 'https://sandbox.zarinpal.com/pg/v4/payment/request.json'
            : 'https://payment.zarinpal.com/pg/v4/payment/request.json'
    }

    private getVerifyUrl() {
        return this.sandbox
            ? 'https://sandbox.zarinpal.com/pg/v4/payment/verify.json'
            : 'https://payment.zarinpal.com/pg/v4/payment/verify.json'
    }
    private getRefundUrl() {
        return this.sandbox
            ? 'https://sandbox.zarinpal.com/pg/v4/payment/refund.json'
            : 'https://payment.zarinpal.com/pg/v4/payment/refund.json';
    }

    private getRedirectUrl(authority: string) {
        return this.sandbox
            ? `https://sandbox.zarinpal.com/pg/StartPay/${authority}`
            : `https://payment.zarinpal.com/pg/StartPay/${authority}`
    }

    async pay(amount: number, callbackUrl: string, meta: any = {}) {

        const response = await axios.post(this.getRequestUrl(), {
            merchant_id: this.merchantId,
            amount: Math.floor(amount),
            callback_url: callbackUrl,
            description: meta.description ?? 'پرداخت سفارش',
            metadata: {
                email: meta.email,
                mobile: meta.mobile,
            },
        })

        const data = response.data

        if (data.data.code !== 100 || !data.data.authority) {
            throw new Error(`Zarinpal error: ${data.data.code}`)
        }

        return {
            authority: data.data.authority,
            redirectUrl: this.getRedirectUrl(data.data.authority),
        }
    }

    async verify(payload: {
        Authority: string
        Status: string
        Amount: number
    }) {
        console.log('🟢 شروع عملیات Verify');
        console.log('📥 Payload ورودی:', payload);
        console.log('🌐 URL درگاه:', this.getVerifyUrl());

        // 1. بررسی اولیه
        if (!payload.Authority || payload.Status !== 'OK') {
            console.log('❌ خطای اعتبارسنجی اولیه: Authority خالی یا Status نامعتبر است');
            throw new Error('پرداخت لغو شد یا اطلاعات نامعتبر است');
        }

        // 2. ایجاد کنترلر برای لغو درخواست (Timeout)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            console.log('⏳ زمان پاسخگویی تمام شد. لغو درخواست توسط AbortController');
            controller.abort();
        }, 10000); // 10 ثانیه

        try {
            console.log('🚀 ارسال درخواست POST به درگاه...');

            const response = await axios.post(
                this.getVerifyUrl(),
                {
                    merchant_id: this.merchantId,
                    authority: payload.Authority,
                    amount: payload.Amount,
                },
                {
                    signal: controller.signal,
                    timeout: 10000,
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }
            );

            // اگر موفق بود، تایمر را پاک می‌کنیم
            clearTimeout(timeoutId);

            console.log('✅ پاسخ دریافت شد از درگاه');
            console.log('📤 Full Response Data:', response.data);
            console.log('📊 Status Code:', response.status);

            const data = response.data;

            // 3. بررسی ساختار داده
            if (!data || !data.data) {
                console.log('⚠️ ساختار پاسخ نامعتبر است. داده دریافتی:', data);
                throw new Error('پاسخ نامعتبر از درگاه دریافت شد');
            }


            // 4. بررسی کدهای درگاه
            if (data.data.code === 100) {
                console.log('✅ پرداخت موفق (Code 100)');
                return {
                    success: true,
                    refId: data.data.ref_id,
                    cardPan: data.data.card_pan,
                    fee: data.data.fee,
                    feeType: data.data.fee_type,
                    orderId: data.data.order_id,
                };
            }

            if (data.data.code === 101) {
                console.log('ℹ️ تراکنش قبلاً تایید شده (Code 101)');
                return {
                    success: true,
                    message: 'تراکنش قبلاً تایید شده است',
                    refId: data.data.ref_id,
                };
            }

            // اگر کد دیگری برگرداند
            console.log('⚠️ کد پاسخ نامشخص:', data.data.code, 'پیام:', data.data.message);
            throw new Error(`خطای درگاه: ${data.data.message || 'کد نامشخص'} (${data.data.code})`);

        } catch (error: any) {
            // تایمر را در صورت خطا هم پاک می‌کنیم
            clearTimeout(timeoutId);

            console.log('❌ خطا در Verify رخ داد!');


            // چاپ جزئیات خطا برای دیباگ
            if (error instanceof AxiosError) {
                console.error('🔴 Axios Error Details:');
                console.error('  - Name:', error.name);
                console.error('  - Message:', error.message);
                console.error('  - Code:', error.code);
                console.error('  - Status:', error.response?.status);
                console.error('  - Data:', error.response?.data);
                console.error('  - Config URL:', error.config?.url);
            } else {
                console.error('🔴 Unknown Error:', error.message);
            }

            // مدیریت خطای Timeout
            if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
                console.log('⛔ خطا از نوع Timeout است');
                throw new Error('زمان پاسخگویی درگاه به پایان رسید (Timeout)');
            }

            // مدیریت خطاهای شبکه
            if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                console.log('⛔ خطا از نوع شبکه است');
                throw new Error('عدم اتصال به سرور درگاه');
            }

            // مدیریت خطاهای HTTP
            if (error.response) {
                console.log('⛔ خطای HTTP از درگاه دریافت شد');
                throw new Error(`خطای درگاه (${error.response.status}): ${error.response.data?.message || 'خطای سرور'}`);
            }

            throw new Error(`خطای غیرمنتظره: ${error.message}`);
        }
    }

    shouldRedirect(): boolean {
        return true
    }

    // ─── متد جدید: برگشت وجه ───
    async refund(payload: {
        authority: string;
        amount: number;
    }) {
        this.logger.log(`درخواست برگشت وجه - authority: ${payload.authority}, amount: ${payload.amount}`);

        const response = await axios.post(this.getRefundUrl(), {
            merchant_id: this.merchantId,
            authority: payload.authority,
            amount: payload.amount,
        });

        const data = response.data;
        this.logger.log(`نتیجه برگشت وجه: ${JSON.stringify(data)}`);

        if (data.data.code === 100 || data.data.code === 101) {
            return {
                RefID: data.data.ref_id?.toString(),
                message: data.data.code === 101 ? 'Already refunded' : 'Refund successful',
            };
        }

        throw new Error(`برگشت وجه ناموفق: ${data.data.code} - ${data.errors?.message}`);
    }
}