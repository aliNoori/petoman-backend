import {Injectable, Logger} from '@nestjs/common';
import {HttpService} from '@nestjs/axios';
import {firstValueFrom} from 'rxjs';

@Injectable()
export class SmsService {
    private readonly logger = new Logger(SmsService.name);
    private readonly apiKey = process.env.IPPANEL_API_KEY;
    private readonly username = process.env.PANEL_USER_NAME;
    private readonly password = process.env.PANEL_PASS;
    private readonly originator = process.env.IPPANEL_ORIGINATOR;
    private readonly baseUrl = process.env.IPPANEL_BASE_URL || 'https://edge.ippanel.com/v1';

    constructor(private readonly httpService: HttpService) {
    }

    async send(phone: string, message: string): Promise<boolean> {
        try {
            if (process.env.NODE_ENV === 'local') {
                this.logger.log(`📱 SMS to ${phone}: ${message}`);
                return true;
            }

            if (!this.apiKey || !this.originator) {
                this.logger.error('SMS Service: IPPanel API key or originator not configured');
                return false;
            }

            const formattedPhone = this.formatPhoneNumber(phone);

            const response = await firstValueFrom(
                this.httpService.post(
                    `${this.baseUrl}/api/send/webservice`,
                    {
                        apikey: this.apiKey,
                        from: this.originator,
                        message: message,
                        to: formattedPhone,
                        username: this.username,
                        password: this.password,
                    },
                ),
            );

            if (response.status === 200) {
                this.logger.log(`SMS sent successfully via IPPanel: ${JSON.stringify(response.data)}`);
                return true;
            }

            this.logger.error(`SMS sending failed: ${response.status} - ${response.data}`);
            return false;
        } catch (error) {
            this.logger.error(`SMS Service Exception: ${error.message}`);
            return false;
        }
    }

    async sendPattern(phone: string, patternCode: string, parameters: Record<string, any>): Promise<boolean> {

        try {
            if (process.env.NODE_ENV === 'local') {
                this.logger.log(`📱 OTP SMS to ${phone}: ${parameters.code}`);
                return true;
            }

            if (!this.apiKey || !this.originator) {
                this.logger.error('SMS Pattern Service: IPPanel API key or originator not configured');
                return false;
            }

            // نرمال‌سازی شماره به فرمت E.164
            if (!phone.startsWith('+')) {
                if (phone.startsWith('0')) {
                    phone = '+98' + phone.substring(1);
                } else {
                    phone = '+98' + phone;
                }
            }

            const payload = {
                sending_type: 'pattern',
                from_number: this.originator,
                code: patternCode,
                recipients: [phone],
                params: parameters,
            };

            console.log('payload',payload)

            const response = await firstValueFrom(
                this.httpService.post(`${this.baseUrl}/api/send`, payload, {
                    headers: {
                        Authorization: this.apiKey,
                        'Content-Type': 'application/json',
                    },
                }),
            );

            const result = response.data;

            if (response.status === 200 && result?.meta?.status === true) {
                this.logger.log(`SMS Pattern sent successfully: ${JSON.stringify(result)}`);
                return true;
            }

            this.logger.error(`SMS Pattern failed: ${response.status} - ${JSON.stringify(result)}`);
            return false;
        } catch (error) {
            this.logger.error(`SMS Pattern Exception: ${error.message}`);
            return false;
        }
    }

    isValidIranianPhone(phone: string): boolean {
        phone = phone.replace(/\s+/g, '').replace(/[-()+]/g, '');
        return /^09\d{9}$/.test(phone) || /^9\d{9}$/.test(phone) || /^989\d{9}$/.test(phone);
    }

    normalizePhone(phone: string): string {
        phone = phone.replace(/\s+/g, '').replace(/[-()+]/g, '');
        if (/^989\d{9}$/.test(phone)) return '0' + phone.substring(2);
        if (/^9\d{9}$/.test(phone)) return '0' + phone;
        return phone;
    }

    generateOtpCode(length = 6): string {
        const max = Math.pow(10, length) - 1;
        const code = Math.floor(Math.random() * max).toString();
        return code.padStart(length, '0');
    }

    formatOtpMessage(code: string, expiryMinutes = 5): string {
        return `کد تأیید شما: ${code}\nاعتبار: ${expiryMinutes} دقیقه\nلطفاً این کد را به کسی ندهید.`;
    }
    // تابع کمکی برای فرمت کردن شماره تلفن
    private formatPhoneNumber(phone: string): string {
        // حذف فاصله‌ها و کاراکترهای اضافی
        let cleaned = ('' + phone).trim();

        // اگر با 09 شروع شد، 0 را حذف و +98 اضافه کن
        if (cleaned.startsWith('09')) {
            return '+98' + cleaned.substring(1);
        }

        // اگر با 98 شروع شد (بدون +)، یک + اضافه کن
        if (cleaned.startsWith('98') && !cleaned.startsWith('+98')) {
            return '+' + cleaned;
        }

        // اگر قبلاً فرمت درستی داشت یا تغییر دیگری نیاز نبود، همان را برگردان
        return cleaned;
    }
}