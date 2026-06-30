import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentSetting } from './payment-setting.entity';
import { PaymentSettingDto } from './dto/update-payment-setting.dto';

@Injectable()
export class PaymentSettingService {
    constructor(
        @InjectRepository(PaymentSetting)
        private readonly paymentRepo: Repository<PaymentSetting>,
    ) {}

    async getSettings() {
        const settings = await this.paymentRepo.find();
        // برگرداندن به صورت آرایه یا شیء key/value
        return settings.reduce((acc, item) => {
            acc[item.key] = item.value;
            return acc;
        }, {} as Record<string, any>);
    }

    async updateSettings(dto: PaymentSettingDto) {
        const tasks = dto.settings.map(async s => {
            let setting = await this.paymentRepo.findOne({ where: { key: s.key } });
            if (!setting) {
                setting = this.paymentRepo.create({ key: s.key, value: s.value });
            } else {
                setting.value = s.value;
            }
            return this.paymentRepo.save(setting);
        });

        return Promise.all(tasks);
    }
}