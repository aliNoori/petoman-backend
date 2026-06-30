import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {DanimOpenGraphSetting} from "./open-graph-setting.entity";

@Injectable()
export class DanimOpenGraphSettingService {
    constructor(
        @InjectRepository(DanimOpenGraphSetting)
        private readonly openGraphRepo: Repository<DanimOpenGraphSetting>,
    ) {}

    async set(key: string, value: Record<string, any>) {
        if (!key) throw new Error('Key is required');

        let setting = await this.openGraphRepo.findOne({ where: { key } });

        if (!setting) {
            setting = this.openGraphRepo.create({ key, value });
        } else {
            setting.value = value;
        }

        return this.openGraphRepo.save(setting);
    }

    async get(key: string) {
        const setting = await this.openGraphRepo.findOne({ where: { key } });
        return setting ? setting.value : null;
    }

    async getAllAsObject() {
        const settings = await this.openGraphRepo.find();
        return settings.reduce((obj, item) => {
            obj[item.key] = item.value;
            return obj;
        }, {} as Record<string, any>);
    }

    async updateMany(settings: { key: string; value: Record<string, any> }[]) {
        const tasks = settings.map(s => this.set(s.key, s.value));
        return Promise.all(tasks);
    }


}