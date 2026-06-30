import {Injectable, NotFoundException} from '@nestjs/common';
import {InjectDataSource, InjectRepository} from '@nestjs/typeorm';
import {DataSource, Repository} from 'typeorm';
import {MarketSetting} from "./market-setting.entity";
import {TenantContext} from "../../../tenants/tenant-context.service";
import {UpdateShippingDto} from "./dto/market-shipping.dto";
import {I18nService} from "nestjs-i18n";
import {PendingShopInfoChange} from "./pending-shop-info-change.entity";
import {UpdateTimeSlotsDto} from "./dto/market-time-slots.dto";

@Injectable()
export class MarketSettingService {
    private settingRepo: Repository<MarketSetting>;

    constructor(
        @InjectDataSource() private dataSource: DataSource,
        private readonly tenantContext: TenantContext,
        @InjectRepository(PendingShopInfoChange) private pendingShopInfoRepo: Repository<PendingShopInfoChange>,
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
     * به‌روزرسانی تنظیمات ارسال
     */
    async updateTimeSlotsSettings(dto: UpdateTimeSlotsDto) {

        const payload = {
            slots: dto.timeSlots
        };
        return this.updateSetting('timeSlots', payload);
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
     * به‌روزرسانی دسته‌جمعی تنظیمات (با مدیریت درخواست تغییر shopInfo)
     */
    async bulkUpdateSettings(dto: any) {
        const tenantId = this.tenantContext.getTenantId();

        if (dto.shopInfo) {
            const newShopInfo = dto.shopInfo;

            if (newShopInfo.pendingChanges) {
                // دریافت اطلاعات فعلی
                const currentSettingRecord = await this.settingRepo.findOne({
                    where: { tenantId, key: 'shopInfo' }
                });
                const currentShopInfo = currentSettingRecord ? currentSettingRecord.value : {};

                // حذف فیلد کنترلی pendingChanges برای مقایسه و ذخیره
                const { pendingChanges, ...dataToCompare } = newShopInfo;

                // ۲. استخراج فقط کلیدهای فیلدهای تغییر کرده
                const changedKeys = Object.keys(this.getDiff(dataToCompare, currentShopInfo));


                if (changedKeys.length > 0) {
                    const existingRequest = await this.pendingShopInfoRepo.findOne({
                        where: { tenantId }
                    });
                    // ۳. ساخت دو آبجکت جداگانه برای مقادیر قدیمی و جدید
                    const oldValues: Record<string, any> = {};
                    const newValues: Record<string, any> = {};

                    changedKeys.forEach(key => {
                        // مقدار قبلی را از دیتابیس می‌خوانیم
                        oldValues[key] = currentShopInfo[key];
                        // مقدار جدید را از ورودی می‌خوانیم
                        newValues[key] = dataToCompare[key];
                    });

                    // ۴. ساخت ساختار نهایی با دو فیلد جداگانه
                    const finalChanges = {
                        oldValues: oldValues,
                        newValues: newValues
                    };

                    if (existingRequest) {
                        existingRequest.changes = finalChanges;
                        await this.pendingShopInfoRepo.save(existingRequest);
                    } else {
                        await this.pendingShopInfoRepo.save({
                            tenantId,
                            changes: finalChanges,
                            description: await this.i18n.t('shop.market.logo_change_request_desc')
                        });
                    }
                }

                // جلوگیری از ذخیره در تنظیمات اصلی تا زمان تایید مدیر
                delete dto.shopInfo;

            } else {
                // اگر تایید نهایی است (یا تغییر عادی)، درخواست‌های معلق قبلی را پاک کن
                await this.pendingShopInfoRepo.delete({ tenantId });
                delete newShopInfo.pendingChanges;
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

        return { message: await this.i18n.t('shop.market.settings_updated_successfully') };
    }
}