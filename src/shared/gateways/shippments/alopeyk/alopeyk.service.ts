import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import * as axios from 'axios';

export interface AlopeykAddress {
    type: 'origin' | 'destination';
    lat: string;
    lng: string;
    description?: string;
    unit?: string;
    number?: string;
    person_fullname?: string;
    person_phone?: string;
}

export interface CreateAlopeykOrderDto {
    origin: AlopeykAddress;
    destination: AlopeykAddress;
    transportType?: string; // پیش‌فرض: motorbike
    has_return?:boolean,
    cashed?: boolean; // پیش‌فرض: false
    schedule_at?:string;
    extraParams?: any; // برای نگاشت به سفارش داخلی
}

@Injectable()
export class AlopeykService {
    private readonly ALOPEYK_API_TOKEN = process.env.ALOPEYK_API_TOKEN;
    private readonly apiUrl = 'https://api.alopeyk.com/api/v2/orders'; // از sandbox برای تست استفاده کنید

    /**
     * ایجاد سفارش در الوپیک
     */
    async createOrder(dto: CreateAlopeykOrderDto): Promise<any> {
        try {

            const buildAddress = (addr: AlopeykAddress, type: 'origin' | 'destination') => {
                return {
                    type: type,
                    lat: String(addr.lat), // تبدیل به رشته طبق نمونه سایت
                    lng: String(addr.lng), // تبدیل به رشته طبق نمونه سایت
                    description: addr.description || '',
                    unit: addr.unit || '',
                    number: addr.number || '',
                    person_fullname: addr.person_fullname || '',
                    person_phone: addr.person_phone || ''
                };
            };

            const addresses = [
                buildAddress(dto.origin, 'origin'),
                buildAddress(dto.destination, 'destination')
            ];

            let extraParamsString = '{}';
            if (dto.extraParams) {
                // اگر extraParams خودش یک آبجکت است، آن را به رشته تبدیل می‌کنیم
                if (typeof dto.extraParams === 'string') {
                    extraParamsString = dto.extraParams;
                } else {
                    extraParamsString = JSON.stringify(dto.extraParams);
                }
            }

            let scheduledAt = '';
            if (dto.schedule_at) {
                scheduledAt = dto.schedule_at;
            }

            // 3. ساخت بدنه نهایی درخواست
            const payload = {
                transport_type: dto.transportType || 'motorbike',
                addresses: addresses,
                has_return: dto.has_return||false, // اضافه کردن فیلد اختیاری اما رایج
                cashed: dto.cashed || false,
                scheduled_at : scheduledAt,
                extra_params: extraParamsString // ارسال به صورت رشته
            };


            const response = await axios.default.post(
                this.apiUrl,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${this.ALOPEYK_API_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            const orderData = response.data.object?.items?.[0] || response.data.object;

            return {
                success: true,
                data: orderData
            };
        } catch (error) {
            console.error('Alopeyk Create Order Error:', error.response?.data || error.message);

            if (error.response?.data) {
                console.error('Alopeyk Error Response:', JSON.stringify(error.response.data, null, 2));

                // بررسی خطای خاص سرویس‌دهی
                if (error.response.data.object?.error === 'VALIDATION_ERROR' &&
                    error.response.data.object?.error_msg?.includes('قابل پشتیبانی نمی باشد')) {

                    // پیام اختصاصی برای کاربر
                    throw new HttpException(
                        'متأسفانه سرویس الوپیک در مسیر انتخابی شما (مبدا و مقصد) فعال نیست. لطفاً از سرویس‌های بین‌شهری دیگر استفاده کنید.',
                        HttpStatus.BAD_REQUEST
                    );
                }
            }

            if (error.response?.status === 401) {
                throw new HttpException('توکن دسترسی الوپیک نامعتبر است', HttpStatus.UNAUTHORIZED);
            }

            const message = error.response?.data?.message || 'خطا در ایجاد سفارش در الوپیک';
            throw new HttpException(message, HttpStatus.BAD_REQUEST);
        }
    }

    /**
     * دریافت وضعیت سفارش الوپیک (همان متد قبلی)
     */
    async getAlopeykOrderStatus(alopeykOrderId: string): Promise<any> {
        try {

            const response = await axios.default.get(
                `${this.apiUrl}/${alopeykOrderId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.ALOPEYK_API_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const data = response.data.object;

            return {
                success: true,
                data: {
                    status: data.status,
                    progress: data.progress,
                    courier: {
                        name: `${data.courier?.firstname || ''} ${data.courier?.lastname || ''}`.trim(),
                        phone: data.courier?.phone,
                        avatar: data.courier?.abs_avatar?.url
                    },
                    trackingUrl: data.order_token ? `https://tracking.alopeyk.com/#/${data.order_token}` : null,
                    // سایر فیلدها...
                }
            };

        } catch (error) {
            console.error('Alopeyk Status Error:', error.response?.data || error.message);
            if (error.response?.status === 404) {
                throw new HttpException('سفارش در الوپیک یافت نشد', HttpStatus.NOT_FOUND);
            }
            throw new HttpException('خطا در دریافت وضعیت', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * لغو سفارش در الوپیک
     * فقط قبل از پذیرش توسط پیک (وضعیت new) امکان‌پذیر است.
     */
    async cancelOrder(alopeykOrderId: string): Promise<any> {
        try {
            const response = await axios.default.get(
                `${this.apiUrl}/${alopeykOrderId}/cancel`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.ALOPEYK_API_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return {
                success: true,
                data: response.data.object
            };

        } catch (error) {
            console.error('Alopeyk Cancel Error:', error.response?.data || error.message);

            // اگر پیک قبلاً سفارش را پذیرفته باشد، الوپیک ارور می‌دهد
            if (error.response?.status === 400 || error.response?.status === 422) {
                throw new HttpException('سفارش قابل لغو نیست (پیک آن را پذیرفته است)', HttpStatus.BAD_REQUEST);
            }

            throw new HttpException('خطا در لغو سفارش در الوپیک', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}