import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminSetting} from "./admin-settings-entity";
import { BulkUpdateAdminSettingsDto} from "./update-admin-settings.dto";

@Injectable()
export class AdminSettingsService {
    constructor(
        @InjectRepository(AdminSetting)
        private readonly settingRepository: Repository<AdminSetting>,
    ) {}

    async findAll(): Promise<Record<string, any>> {
        const settings = await this.settingRepository.find();
        const result = {};

        // تبدیل آرایه خروجی دیتابیس به یک آبجکت تو در تو
        settings.forEach((item) => {
            result[item.key] = item.value;
        });

        return result;
    }

    async updateBulk(dto: BulkUpdateAdminSettingsDto): Promise<void> {
        const { settings } = dto;

        // ذخیره یا بروزرسانی هر کلید
        for (const [key, value] of Object.entries(settings)) {
            // تشخیص گروه بر اساس کلید (مثلا payment.zarinpal -> group: payment)
            const group = key.split('.')[0] || 'general';

            const existingSetting = await this.settingRepository.findOne({
                where: { key },
            });

            if (existingSetting) {
                existingSetting.value = value;
                await this.settingRepository.save(existingSetting);
            } else {
                const newSetting = this.settingRepository.create({
                    key,
                    value,
                    group,
                });
                await this.settingRepository.save(newSetting);
            }
        }
    }
}