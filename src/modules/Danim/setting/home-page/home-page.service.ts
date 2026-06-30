import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {DanimHomePageSetting} from "./home-page.enitity";

@Injectable()
export class DanimHomePageSettingService {
    constructor(
        @InjectRepository(DanimHomePageSetting)
        private readonly generalRepo: Repository<DanimHomePageSetting>,
    ) {}

    async get(key: string) {
        const setting = await this.generalRepo.findOne({ where: { key } });
        return setting ? setting.value : null;
    }

    async set(key: string, value: any) {
        let setting = await this.generalRepo.findOne({ where: { key } });

        if (!setting) {
            setting = this.generalRepo.create({ key, value });
        } else {
            setting.value = value;
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