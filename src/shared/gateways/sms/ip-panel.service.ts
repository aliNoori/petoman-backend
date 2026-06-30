import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class IPPanelService {
    private readonly logger = new Logger(IPPanelService.name);
    private readonly apiKey = process.env.IPPANEL_API_KEY;
    private readonly baseUrl = process.env.IPPANEL_BASE_URL;
    private readonly originator = process.env.IPPANEL_ORIGINATOR;

    constructor(private readonly httpService: HttpService) {}

    async sendPattern(phone: string, variables: Record<string, any>) {
        try {
            const patternCode = process.env.IPPANEL_PATTERN_CODE;

            const response = await firstValueFrom(
                this.httpService.post(
                    `${this.baseUrl}/api/v1/sms/pattern/normal/send`,
                    {
                        code: patternCode,
                        sender: this.originator,
                        recipient: this.normalizePhone(phone),
                        variable: variables,
                    },
                    {
                        headers: {
                            apikey: this.apiKey,
                            'Content-Type': 'application/json',
                        },
                    },
                ),
            );

            const result = response.data;
            const isSuccess = response.status === 200 && result?.status === 'OK';

            this.logger.log(`IPPanel OTP Response: ${JSON.stringify(result)}`);

            // اینجا می‌تونی لاگ پیامک رو در دیتابیس ذخیره کنی
            // await this.logSms(phone, JSON.stringify(variables), 'otp', isSuccess ? 'sent' : 'failed', result);

            return {
                success: isSuccess,
                message: result?.message ?? (isSuccess ? 'پیام ارسال شد' : 'خطا در ارسال پیام'),
                data: result,
            };
        } catch (error) {
            this.logger.error(`IPPanel Pattern SMS Error: ${error.message}`);
            return { success: false, message: error.message, data: null };
        }
    }

    async sendBulk(phones: string[], message: string) {
        try {
            const response = await firstValueFrom(
                this.httpService.post(
                    `${this.baseUrl}/api/v1/sms/send/bulk`,
                    {
                        sender: this.originator,
                        recipients: phones.map((p) => this.normalizePhone(p)),
                        message,
                    },
                    {
                        headers: {
                            apikey: this.apiKey,
                            'Content-Type': 'application/json',
                        },
                    },
                ),
            );

            const result = response.data;
            return {
                success: response.status === 200,
                message: result?.message ?? 'Unknown error',
                data: result,
            };
        } catch (error) {
            this.logger.error(`IPPanel Bulk SMS Error: ${error.message}`);
            return { success: false, message: error.message, data: null };
        }
    }

    async sendSingle(phone: string, message: string) {
        try {
            const response = await firstValueFrom(
                this.httpService.post(
                    `${this.baseUrl}/api/v1/sms/send/webservice/single`,
                    {
                        sender: this.originator,
                        recipient: this.normalizePhone(phone),
                        message,
                    },
                    {
                        headers: {
                            apikey: this.apiKey,
                            'Content-Type': 'application/json',
                        },
                    },
                ),
            );

            const result = response.data;
            return {
                success: response.status === 200,
                message: result?.message ?? 'Unknown error',
                data: result,
            };
        } catch (error) {
            this.logger.error(`IPPanel Single SMS Error: ${error.message}`);
            return { success: false, message: error.message, data: null };
        }
    }

    private normalizePhone(phone: string): string {
        phone = phone.replace(/[^0-9]/g, '');
        if (phone.startsWith('98')) return phone;
        if (phone.startsWith('0')) return '98' + phone.substring(1);
        return '98' + phone;
    }
}