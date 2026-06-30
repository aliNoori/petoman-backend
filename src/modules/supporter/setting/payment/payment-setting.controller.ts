import { Controller, Get, Patch, Body } from '@nestjs/common';
import { PaymentSettingService } from './payment-setting.service';
import { PaymentSettingDto } from './dto/update-payment-setting.dto';

@Controller({ path: 'settings/payment' })
export class PaymentSettingController {
    constructor(private readonly paymentService: PaymentSettingService) {}

    // گرفتن همه تنظیمات پرداخت به صورت key/value
    @Get()
    async getSettings() {
        return this.paymentService.getSettings();
    }

    // آپدیت چندین تنظیم با هم
    @Patch()
    async updateSettings(@Body() dto: PaymentSettingDto) {
        return this.paymentService.updateSettings(dto);
    }
}
