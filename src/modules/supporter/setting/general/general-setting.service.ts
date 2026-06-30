import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GeneralSetting } from './general-setting.entity';

@Injectable()
export class GeneralSettingService {
    constructor(
        @InjectRepository(GeneralSetting)
        private readonly generalRepo: Repository<GeneralSetting>,
    ) {}

    async get(key: string) {
        const setting = await this.generalRepo.findOne({ where: { key } });
        return setting ? setting.value : null;
    }

    async set(key: string, value: any) {
        let setting = await this.generalRepo.findOne({ where: { key } });

        if (!setting) {
            setting = this.generalRepo.create({ key, value: String(value) });
        } else {
            setting.value = String(value);
        }

        return this.generalRepo.save(setting);
    }

    async getAllAsObject() {
        const settings = await this.generalRepo.find();
        return settings.reduce((obj, item) => {
            obj[item.key] = item.value;
            return obj;
        }, {});
    }

    async updateMany(settings: { key: string; value: any }[]) {
        const tasks = settings.map(s => this.set(s.key, s.value));
        return Promise.all(tasks);
    }

}