import {Injectable, NotFoundException} from '@nestjs/common';
import {InjectDataSource, InjectRepository} from '@nestjs/typeorm';
import {DataSource, Repository} from 'typeorm';
import {TenantContext} from "../../../tenants/tenant-context.service";
import {I18nService} from "nestjs-i18n";
import {MarketSetting} from "../../market/settings/market-setting.entity";
import {PendingShopInfoChange} from "../../market/settings/pending-shop-info-change.entity";
import {UpdateShippingDto} from "../../market/settings/dto/market-shipping.dto";


@Injectable()
export class PharmacySettingService {
    private settingRepo: Repository<MarketSetting>;

    constructor(
        @InjectDataSource() private dataSource: DataSource,
        private readonly tenantContext: TenantContext,
        @InjectRepository(PendingShopInfoChange) private pendingPharmacyInfoRepo: Repository<PendingShopInfoChange>,
        private readonly i18n: I18nService
    ) {
        this.settingRepo = this.dataSource.getRepository(MarketSetting);
    }

    /**
     * دریافت تمام تنظیمات به صورت یک آبجکت
     */
    async getAllSettings() {
        const tenantId = this.tenantContext.getTenantId();
        const settings = await this.settingRepo.find({
            where: { tenantId }
        });

        const result: any = {};
        settings.forEach(item => {
            result[item.key] = item.value;
        });
        return result;
    }

    /**
     * دریافت یک تنظیم خاص بر اساس کلید
     */
    async getSetting(key: string) {
        const tenantId = this.tenantContext.getTenantId();
        const setting = await this.settingRepo.findOne({
            where: { tenantId, key }
        });

        if (!setting) {
            return null;
        }
        return setting.value;
    }

    /**
     * ایجاد یا به‌روزرسانی یک تنظیم خاص
     */
    async updateSetting(key: string, value: any) {
        const tenantId = this.tenantContext.getTenantId();
        let setting = await this.settingRepo.findOne({
            where: { tenantId, key }
        });

        if (setting) {
            setting.value = value;
        } else {
            setting = this.settingRepo.create({
                tenantId,
                key,
                value
            });
        }
        return this.settingRepo.save(setting);
    }

    /**
     * به‌روزرسانی تنظیمات ارسال
     */
    async updateShippingSettings(dto: UpdateShippingDto) {

        const payload = {
            methods: dto.methods
        };
        return this.updateSetting('shipping_methods', payload);
    }

    /**
     * تابع کمکی برای پیدا کردن تفاوت بین دو آبجکت
     */
    private getDiff(newData: any, oldData: any): any {
        const diff: any = {};
        const keys = Object.keys(newData);

        keys.forEach(key => {
            if (!oldData.hasOwnProperty(key) || oldData[key] !== newData[key]) {
                diff[key] = newData[key];
            }
        });

        return Object.keys(diff).length > 0 ? diff : null;
    }

    /**
     * به‌روزرسانی دسته‌جمعی تنظیمات (با مدیریت درخواست تغییر PharmacyInfo)
     */
    async bulkUpdateSettings(dto: any) {
        const tenantId = this.tenantContext.getTenantId();

        if (dto.pharmacyInfo) {
            const newPharmacyInfo = dto.pharmacyInfo;

            if (newPharmacyInfo.pendingChanges) {
                // ۱. دریافت اطلاعات فعلی از دیتابیس
                const currentSettingRecord = await this.settingRepo.findOne({
                    where: { tenantId, key: 'pharmacyInfo' }
                });

                // مقدار فعلی (Old Value)
                const currentPharmacyInfo = currentSettingRecord ? currentSettingRecord.value : {};

                // حذف فیلد کنترلی pendingChanges برای مقایسه
                const { pendingChanges, ...dataToCompare } = newPharmacyInfo;

                // ۲. استخراج فقط کلیدهای فیلدهای تغییر کرده
                const changedKeys = Object.keys(this.getDiff(dataToCompare, currentPharmacyInfo));

                if (changedKeys.length > 0) {
                    // ۳. ساخت دو آبجکت جداگانه برای مقادیر قدیمی و جدید
                    const oldValues: Record<string, any> = {};
                    const newValues: Record<string, any> = {};

                    changedKeys.forEach(key => {
                        // مقدار قبلی را از دیتابیس می‌خوانیم
                        oldValues[key] = currentPharmacyInfo[key];
                        // مقدار جدید را از ورودی می‌خوانیم
                        newValues[key] = dataToCompare[key];
                    });

                    // ۴. ساخت ساختار نهایی با دو فیلد جداگانه
                    const finalChanges = {
                        oldValues: oldValues,
                        newValues: newValues
                    };

                    const existingRequest = await this.pendingPharmacyInfoRepo.findOne({
                        where: { tenantId }
                    });

                    if (existingRequest) {
                        existingRequest.changes = finalChanges;
                        await this.pendingPharmacyInfoRepo.save(existingRequest);
                    } else {
                        await this.pendingPharmacyInfoRepo.save({
                            tenantId,
                            changes: finalChanges,
                            description: await this.i18n.t('Pharmacy.market.logo_change_request_desc')
                        });
                    }
                }

                // جلوگیری از ذخیره در تنظیمات اصلی تا زمان تایید مدیر
                delete dto.pharmacyInfo;

            } else {
                // اگر تایید نهایی است، درخواست‌های معلق قبلی را پاک کن
                await this.pendingPharmacyInfoRepo.delete({ tenantId });
                delete newPharmacyInfo.pendingChanges;
            }
        }

        // ذخیره سایر تنظیمات
        const promises: Promise<MarketSetting>[] = [];
        for (const key of Object.keys(dto)) {
            if (dto[key] !== undefined) {
                promises.push(this.updateSetting(key, dto[key]));
            }
        }
        await Promise.all(promises);

        return { message: await this.i18n.t('Pharmacy.market.settings_updated_successfully') };
    }
}