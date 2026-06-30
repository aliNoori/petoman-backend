import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppearanceSetting } from './appearance-setting.entity';
import {ConfigService} from "@nestjs/config";

@Injectable()
export class AppearanceSettingService {
    constructor(
        @InjectRepository(AppearanceSetting)
        private readonly repo: Repository<AppearanceSetting>,
        private readonly configService: ConfigService
    ) {}

    // ست کردن یا آپدیت یک مقدار
    async set(key: string, value: string) {
        if (!key) throw new Error('Key is required');

        let setting = await this.repo.findOne({ where: { key } });
        if (!setting) {
            setting = this.repo.create({ key, value });
        } else {
            setting.value = value;
        }

        return this.repo.save(setting);
    }

    // گرفتن یک مقدار
    async get(key: string) {
        const setting = await this.repo.findOne({ where: { key } });
        return setting ? setting.value : null;
    }

    // گرفتن همه مقادیر به صورت یک شیء
    async getAllAsObject() {
        const settings = await this.repo.find();
        return settings.reduce((obj, item) => {
            if (item.value != null) {
                obj[item.key] = item.value;
            }
            return obj;
        }, {} as Record<string, string>);
    }

    // آپدیت چند مقدار با هم
    async updateMany(settings: { key: string; value: string }[]) {
        const tasks = settings.map(s => this.set(s.key, s.value));
        return Promise.all(tasks);
    }

    // آپدیت همراه فایل‌ها
    async updateSettings(
        dto: { metaThemeColor?: string; metaThemeColorDark?: string },
        files?: { logo?: Express.Multer.File[]; favicon?: Express.Multer.File[] },
    ) {
        // فایل‌ها را ذخیره کن و URL بده
        const baseUrl = this.configService.get<string>('BASE_URL')
        if (files?.logo?.[0]) {
            if (files) {
                if (files.logo) {
                    const logoUrl = `${baseUrl}/uploads/appearances/${files.logo[0].filename}`
                    await this.set('logo', logoUrl);
                }
            }

        }

        if (files?.favicon?.[0]) {
            if (files) {
                if (files.favicon) {
                    const faviconUrl = `${baseUrl}/uploads/appearances/${files.favicon[0].filename}`
                    await this.set('favicon', faviconUrl);
                }
            }

        }

        // ذخیره رنگ‌ها
        if (dto.metaThemeColor) {
            await this.set('metaThemeColor', dto.metaThemeColor);
        }

        if (dto.metaThemeColorDark) {
            await this.set('metaThemeColorDark', dto.metaThemeColorDark);
        }

        return this.getAllAsObject();
    }
}