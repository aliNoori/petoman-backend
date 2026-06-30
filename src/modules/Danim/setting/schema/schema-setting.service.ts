import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DanimSchemaSetting } from './schema-setting.entity';
@Injectable()
export class DanimSchemaSettingService {
    constructor(
        @InjectRepository(DanimSchemaSetting)
        private readonly schemaRepo: Repository<DanimSchemaSetting>,
    ) {}

    async set(key: string, value: Record<string, any>) {
        if (!key) throw new Error('Key is required');

        let setting = await this.schemaRepo.findOne({ where: { key } });

        if (!setting) {
            setting = this.schemaRepo.create({ key, value });
        } else {
            setting.value = value;
        }

        return this.schemaRepo.save(setting);
    }

    async get(key: string) {
        const setting = await this.schemaRepo.findOne({ where: { key } });
        return setting ? setting.value : null;
    }

    async getAllAsObject() {
        const settings = await this.schemaRepo.find();
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