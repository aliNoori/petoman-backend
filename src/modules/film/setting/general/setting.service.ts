import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {DeepPartial, ObjectLiteral, Repository} from 'typeorm';
import { FilmGeneralSetting } from './entities/general-setting.entity';
import { FilmOpengraphSetting } from './entities/opengraph-setting.entity';
import { FilmSocialSetting } from './entities/social-setting.entity';
import { FilmAdvanceSetting } from './entities/advance-setting.entity';
import { FilmSeoSetting } from './entities/seo-setting.entity';
import { FilmApiSetting } from './entities/api-setting.entity';

interface KeyValueEntity extends ObjectLiteral {
    key: string;
    value: string | null;
}


@Injectable()
export class FilmSettingService {
    constructor(
        @InjectRepository(FilmGeneralSetting)
        private readonly generalRepo: Repository<FilmGeneralSetting>,
        @InjectRepository(FilmApiSetting)
        private readonly apiRepo: Repository<FilmApiSetting>,
        @InjectRepository(FilmSeoSetting)
        private readonly seoRepo: Repository<FilmSeoSetting>,
        @InjectRepository(FilmAdvanceSetting)
        private readonly advanceRepo: Repository<FilmAdvanceSetting>,
        @InjectRepository(FilmSocialSetting)
        private readonly socialRepo: Repository<FilmSocialSetting>,
        @InjectRepository(FilmOpengraphSetting)
        private readonly opengraphRepo: Repository<FilmOpengraphSetting>,
    ) {}

    /* ------------------ Helpers ------------------- */
    private async setSetting<T extends KeyValueEntity>(
        repo: Repository<T>,
        key: string,
        value: any,
    ): Promise<T> {
        let setting = await repo.findOne({ where: { key } as any });
        if (!setting) {
            setting = repo.create({ key, value: String(value) } as DeepPartial<T>);
        } else {
            setting.value = String(value);
        }
        return repo.save(setting);
    }

    private async updateManySettings<T extends KeyValueEntity>(
        repo: Repository<T>,
        settings: { key: string; value: any }[],
    ) {
        const tasks = settings.map((s) => this.setSetting(repo, s.key, s.value));
        return Promise.all(tasks);
    }

    private async getAllAsObject<T extends KeyValueEntity>(repo: Repository<T>) {
        const settings = await repo.find();
        return settings.reduce((obj: any, item: T) => {
            obj[item.key] = item.value;
            return obj;
        }, {});
    }

    /* ------------------ General ------------------- */
    async getGeneralAll() {
        return this.getAllAsObject(this.generalRepo);
    }

    async updateGeneral(settings: { key: string; value: any }[]) {
        return this.updateManySettings(this.generalRepo, settings);
    }

    /* ------------------ SEO ------------------- */
    async getSeoAll() {
        return this.getAllAsObject(this.seoRepo);
    }

    async updateSeo(settings: { key: string; value: any }[]) {
        return this.updateManySettings(this.seoRepo, settings);
    }

    /* ------------------ API ------------------- */
    async getApiAll() {
        return this.getAllAsObject(this.apiRepo);
    }

    async updateApi(settings: { key: string; value: any }[]) {
        return this.updateManySettings(this.apiRepo, settings);
    }

    /* ------------------ Social ------------------- */
    async getSocialAll() {
        return this.getAllAsObject(this.socialRepo);
    }

    async updateSocial(settings: { key: string; value: any }[]) {
        return this.updateManySettings(this.socialRepo, settings);
    }

    /* ------------------ OpenGraph ------------------- */
    async getOpengraphAll() {
        return this.getAllAsObject(this.opengraphRepo);
    }

    async updateOpengraph(settings: { key: string; value: any }[]) {
        return this.updateManySettings(this.opengraphRepo, settings);
    }

    /* ------------------ Advance ------------------- */
    async getAdvanceAll() {
        return this.getAllAsObject(this.advanceRepo);
    }

    async updateAdvance(settings: { key: string; value: any }[]) {
        return this.updateManySettings(this.advanceRepo, settings);
    }

    /* ------------------ Save All ------------------- */
    async updateAll(payload: {
        general: { key: string; value: any }[];
        seo: { key: string; value: any }[];
        api: { key: string; value: any }[];
        social: { key: string; value: any }[];
        opengraph: { key: string; value: any }[];
        advance: { key: string; value: any }[];
    }) {
        await Promise.all([
            this.updateGeneral(payload.general),
            this.updateSeo(payload.seo),
            this.updateApi(payload.api),
            this.updateSocial(payload.social),
            this.updateOpengraph(payload.opengraph),
            this.updateAdvance(payload.advance),
        ]);
        return { success: true };
    }
}