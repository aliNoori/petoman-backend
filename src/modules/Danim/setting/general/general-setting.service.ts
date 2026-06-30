import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {DanimGeneralSetting} from './general-setting.entity';

@Injectable()
//Service for managing general settings (CRUD operations on key-value pairs)
export class DanimGeneralSettingService {
    constructor(
        @InjectRepository(DanimGeneralSetting)
        private readonly generalRepo: Repository<DanimGeneralSetting>,
    ) {}

    async get(key: string) {
        //Fetch a single setting by key
        const setting = await this.generalRepo.findOne({ where: { key } });
        //Return value if found, otherwise null
        return setting ? setting.value : null;
    }

    async set(key: string, value: any)
    {
        //Check if setting with given key already exists
        let setting = await this.generalRepo.findOne({ where: { key } });
        //If not exists → create new setting
        if (!setting) {
            setting = this.generalRepo.create({ key, value: String(value) });
        } else {
            //If exists → update value
            setting.value = String(value);
        }

        return this.generalRepo.save(setting);
    }

    async getAllAsObject() {
        //Fetch all settings from database
        const settings = await this.generalRepo.find();
        //Map each setting update to a promise
        return settings.reduce((obj, item) => {
            obj[item.key] = item.value;
            return obj;
        }, {});
    }

    async updateMany(settings: { key: string; value: any }[]) {
        const tasks = settings.map(s => this.set(s.key, s.value));
        //Execute all updates in parallel
        return Promise.all(tasks);
    }

}