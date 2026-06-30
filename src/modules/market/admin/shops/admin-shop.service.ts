import {BadRequestException, Injectable, NotFoundException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {DataSource, In, Repository} from 'typeorm';
import {TenantProvisioningService} from "../../../../tenants/tenant-provisioning.service";
import {Tenant, TenantType} from "../../../../core/entities/tenant.entity";
import {ShopRequest} from "../../user/shops/shop-request.entity";
import {I18nService} from "nestjs-i18n";
import {InjectQueue} from "@nestjs/bull";
import {Queue} from "bull";
import {NotificationType} from "../../../../shared/notification/notification.entity";
import {NotificationService} from "../../../../shared/notification/notification.service";
import {PendingShopInfoChange} from "../../settings/pending-shop-info-change.entity";
import {MarketSetting} from "../../settings/market-setting.entity";
import {User} from "../../../../shared/user/entities/user.entity";
import {ShopReview} from "../../review/shop-review.entity";
import {Withdrawal, WithdrawalStatus} from "../../request/entities/withdrawal.entity";
import {Wallet} from "../../../../shared/wallet/wallet.entity";
import {WalletTransactionType} from "../../../../shared/wallet/wallet-transaction.entity";
import {WalletService} from "../../../../shared/wallet/wallet.service";
import {TenantCategory} from "../../category/tenant-category.entity";
import {TenantAddress} from "../../../../core/entities/tenant-address.entity";
import {getTenantTypeLabel} from "../../../../common/helper/helpers";


@Injectable()
export class AdminShopService {
    constructor(
        private readonly i18n: I18nService,
        private dataSource: DataSource,
        private notifService: NotificationService,
        @InjectQueue('send-sms') private smsQueue: Queue, // تزریق صف
        @InjectRepository(ShopRequest) private shopRepo: Repository<ShopRequest>,
        @InjectRepository(Withdrawal)  private withdrawalsRepository: Repository<Withdrawal>,
        @InjectRepository(Wallet)  private walletRepository: Repository<Wallet>,
        @InjectRepository(User) private userRepo: Repository<User>,
        @InjectRepository(PendingShopInfoChange) private pendingShopInfoRepo: Repository<PendingShopInfoChange>,
        private readonly tenantProvisioningService: TenantProvisioningService,
        @InjectRepository(MarketSetting) private settingRepo: Repository<MarketSetting>,
        @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
        @InjectRepository(ShopReview) private reviewRepo: Repository<ShopReview>,
        private walletService: WalletService,
        @InjectRepository(TenantAddress) private tenantAddressRepo: Repository<TenantAddress>,
    ) {
    }

    async findAll(): Promise<any[]> {
        // 1. دریافت تمام درخواست‌های شاپ
        const shopRequests = await this.shopRepo.find({
            where:{status:'pending'}
        });
        // 2. استخراج تمام IDهای دسته‌بندی از تمام رکوردها
        // فرض بر این است که shopRequest.categories یک آرایه از UUIDهاست
        const allCategoryIds = shopRequests.flatMap(req => req.categories || []);

        // 3. اگر IDای وجود داشت، نام آن‌ها را از دیتابیس بگیر
        let categoryMap: Record<string, string> = {};
        if (allCategoryIds.length > 0) {
            const categories = await this.getCategoryRepository().find({
                where: { id: In(allCategoryIds) },
                select: ['id', 'title']
            });

            // تبدیل لیست به یک آبجکت برای دسترسی سریع: { 'id-1': 'نام-1', ... }
            categoryMap = categories.reduce((acc, cat) => {
                acc[cat.id] = cat.title;
                return acc;
            }, {} as Record<string, string>);
        }

        // 4. جایگزینی IDها با نام‌ها در پاسخ نهایی
        return shopRequests.map(req => {
            const plainReq = { ...req }; // کپی آبجکت

            if (plainReq.categories) {
                // تبدیل آرایه IDها به آرایه نام‌ها
                plainReq.categories = plainReq.categories.map(id => categoryMap[id] || id);
            }

            return plainReq;
        });
    }

// تابع کمکی برای گرفتن Repository دسته‌بندی‌ها
    private getCategoryRepository() {
        return this.dataSource.getRepository(TenantCategory); // مطمئن شوید dataSource یا repository را اینجکت کرده‌اید
    }

    /**
     * Find a single shop request by ID
     */
    async findOne(id: string): Promise<ShopRequest> {
        const shop = await this.shopRepo.findOne({where: {id}});
        if (!shop) {
            throw new NotFoundException(`Shop request with ID ${id} not found`);
        }
        return shop;
    }

    /**
     * Approve a shop request:
     * 1. Uses TenantProvisioningService to create the base Tenant.
     * 2. Updates the Tenant with shop-specific details.
     * 3. Marks the request as approved.
     */
    /**
     * _Approve a shop request:_
     * 1. Uses TenantProvisioningService to create the base Tenant.
     * 2. Updates the Tenant with shop-specific details.
     * 3. Marks the request as approved.
     * (Atomic Transaction Implementation)
     */
    async approveShopRequest(requestId: string,adminId:string): Promise<{
        data: Tenant;
        success: boolean;
        message: string
    }> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Find the request inside transaction
            const request = await queryRunner.manager.findOne(ShopRequest, {
                where: { id: requestId },
                relations: ['user']
            } as any);

            if (!request) {
                throw new NotFoundException(await this.i18n.t('shop.request.not_found'));
            }
            if (request.status === 'approved') {
                throw new BadRequestException(await this.i18n.t('shop.request.already_approved'));
            }

            // 2. Use Provisioning Service to create the base Tenant
            // نکته: اگر tenantProvisioningService خودش تراکنش جداگانه دارد، ممکن است با این تراکنش ادغام نشود.
            // اما فرض بر این است که سرویس Provisioning از queryRunner.manager استفاده می‌کند یا تراکنش را مدیریت می‌کند.
            // در اینجا ما فرض می‌کنیم provisionTenant یک آبجکت Tenant برمی‌گرداند که هنوز سیو نشده یا در همین تراکنش سیو شده.
            // برای اطمینان، ما Tenant را با queryRunner.manager ذخیره می‌کنیم.

            const tenant = await this.tenantProvisioningService.provisionTenant(
                adminId,
                request.user,
                request.userId,
                request.shopName,
                request.type,
                queryRunner.manager
            );

            // اگر provisionTenant آبجکت را برنگرداند یا نیاز به ذخیره مجدد داشته باشد:
            if (!tenant) {
                throw new BadRequestException('Tenant provisioning failed');
            }

            const addressPayload = request.address; // کل آبجکت OSM

            const tenantAddress = queryRunner.manager.create(TenantAddress, {
                tenantId: tenant.id,
                // فیلدهای عمومی
                fullAddress: request.addressString || addressPayload.display_name,
                province: request.province,
                city: request.city,
                location: {
                    lat: parseFloat(addressPayload.lat),
                    lng: parseFloat(addressPayload.lon)
                },
                // فیلدهای OSM
                displayName: addressPayload.display_name,
                placeId: addressPayload.place_id,
                osmType: addressPayload.osm_type,
                osmId: addressPayload.osm_id,
                mapClass: addressPayload.class,
                mapType: addressPayload.type,
                placeRank: addressPayload.place_rank,
                importance: addressPayload.importance,
                boundingBox: addressPayload.boundingbox,
                detailedAddress: addressPayload.address, // کل آبجکت زیرمجموعه address

                // استخراج فیلدهای جزئی از ساختار address.address
                street: addressPayload.address?.road,
                neighborhood: addressPayload.address?.neighbourhood,
                district: addressPayload.address?.district,
                suburb: addressPayload.address?.suburb,
                county: addressPayload.address?.county,
                postalCode: addressPayload.address?.postcode,

                isDefault: true
            });

            const address=await queryRunner.manager.save(tenantAddress);

            // 3. Update the newly created Tenant with shop details inside transaction
            const updateData: Partial<Tenant> = {
                ownerName: request.ownerName,
                phone: request.phone,
                email: request.email,
                address: request.address,
                province: request.province,
                city: request.city,
                iban: request.iban,
                documents: request.documents,
            };

            if (request.location) {
                updateData.location = request.location;
            }
            if (request.categories) {
                updateData.categories = request.categories;
            }

            // آپدیت کردن Tenant در داخل تراکنش
            await queryRunner.manager.update(Tenant, tenant.id, updateData);

            // 4. Update request status inside transaction
            request.status = 'approved';
            const savedRequest = await queryRunner.manager.save(request);

            // 5. Fetch updated tenant to return
            const updatedTenant = await queryRunner.manager.findOne(Tenant, {
                where: { id: tenant.id },
                relations:['tenantUsers']
            } as any);



            if (!updatedTenant) {
                throw new NotFoundException('Tenant creation failed');
            }

            updatedTenant.tenantAddress=address

            // 1. تعریف داده‌های shopInfo
            const defaultShopInfoData = {
                name: request.shopName || "نام فروشگاه",
                ownerName: request.ownerName || "نام مالک",
                mobile: request.phone || "09123456789",
                phone: request.phone || "02112345678",
                email: request.email || "info@example.com",
                address: request.address|| "",
                city: request.city || "",
                province: request.province || "",
                postalCode: request.address.postalCode || "",
                logo: request.documents.logo?.thumbnail,
                isApproved: true,
                pendingChanges: false,
                description: "",
                website: "",
                licenseNumber: "",
                medicalSystemCode: "",
                openTime: "09:00",
                closeTime: "21:00",
                closedDays: ["friday"],
                is24Hours: false
            };

            // 2. تعریف داده‌های shipping_methods
            const defaultShippingMethodsData = {
                methods: [
                    { type: "inPerson", isActive: true, deliveryTime: "فوری", price: 0 },
                    { type: "petomanCourier", isActive: true, deliveryTime: "1 تا 2 ساعت", price: 40000 },
                    { type: "shopCourier", isActive: true, deliveryTime: "2 تا 4 ساعت", price: 30000 },
                    { type: "tipax", isActive: true, deliveryTime: "1 تا 2 روز کاری", price: 60000 },
                    { type: "alopeyk", isActive: true, deliveryTime: "1 تا 2 روز کاری", price: 50000 },
                    { type: "post", isActive: true, deliveryTime: "3 تا 5 روز کاری", price: 30000 }
                ]
            };

            const defaultTimeSlotsData = {
                slots: [
                    {id: 1, time: 'ساعت ۹ تا ۱۲', price: 0, available: false},
                    {id: 2, time: 'ساعت ۱۲ تا ۱۵', price: 0, available: false},
                    {id: 3, time: 'ساعت ۱۵ تا ۱۸', price: 0, available: false},
                    {id: 4, time: 'ساعت ۱۸ تا ۲۱', price: 0, available: false},
                    {id: 5, time: 'ساعت ۲۱ تا ۲۴', price: 0, available: false},
                ]
            };

            // رکورد اول: shopInfo
            const shopInfoSetting = queryRunner.manager.create(MarketSetting, {
                tenantId: tenant.id,
                key: 'shopInfo',
                value: defaultShopInfoData
            });
            await queryRunner.manager.save(shopInfoSetting);

            // رکورد دوم: shipping_methods
            const shippingMethodsSetting = queryRunner.manager.create(MarketSetting, {
                tenantId: tenant.id,
                key: 'shipping_methods',
                value: defaultShippingMethodsData
            });

            await queryRunner.manager.save(shippingMethodsSetting);

            // رکورد سوم: timeSlots
            const timeSlotsSetting = queryRunner.manager.create(MarketSetting, {
                tenantId: tenant.id,
                key: 'timeSlots',
                value: defaultTimeSlotsData
            });

            await queryRunner.manager.save(timeSlotsSetting);


            await queryRunner.manager.save(updatedTenant)

            // ۶. ارسال نوتیفیکیشن
            await this.notifService.create({
                userId: request.userId,
                type: NotificationType.IN_APP,
                title: await this.i18n.t('shop.notif.approve_title', { args: { type: getTenantTypeLabel(request.type.toUpperCase()) } }),
                message: await this.i18n.t('shop.notif.approve_message', {
                    args: {
                        shopId: updatedTenant.tenantUsers.find((t) => t.tenantId === updatedTenant.id)?.shopId,
                        type: getTenantTypeLabel(request.type.toUpperCase())
                    }
                }),
                icon: 'ti ti-check text-green-600',
                color: 'bg-green-100',
                panelType: 'MARKET'//`${request.type}`
            });

            // ۷. افزودن job به صف
            await this.smsQueue.add('handle-send-sms', {
                phoneNumber: savedRequest.user.phoneNumber,
                message:await this.i18n.t('shop.notif.approve_message', {
                    args: {
                        shopId: updatedTenant.tenantUsers.find((t) => t.tenantId === updatedTenant.id)?.shopId,
                        type: getTenantTypeLabel(request.type.toUpperCase())
                    }
                }),
            });

            // تایید نهایی تراکنش (Commit)
            await queryRunner.commitTransaction();

            return {
                success: true,
                message: await this.i18n.t('shop.request.approve_success',
                    {args: {type: getTenantTypeLabel(request.type.toUpperCase())}}),
                data: updatedTenant,
            };

        } catch (err) {
            // در صورت بروز خطا، تغییرات را برگردان (Rollback)
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            // قطع اتصال (Release)
            await queryRunner.release();
        }
    }

    /**
     * _Request revision for a shop request_
     * Sets status to 'needs_revision' and saves the reason.
     */
    async revisionShopRequest(requestId: string, reason: string): Promise<{
        data: ShopRequest;
        success: boolean;
        message: string
    }> {

        // اصلاح شده: استفاده از dataSource برای ایجاد کوئری‌رانر
        const queryRunner = this.dataSource.createQueryRunner();

        // اتصال به دیتابیس و شروع تراکنش
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // استفاده از manager برای اجرای کوئری‌ها در داخل تراکنش
            const request = await queryRunner.manager.findOne(ShopRequest, {
                where: { id: requestId },
                relations: ['user'] // برای جلوگیری از کوئری اضافه، اینجا رلیشن را لود می‌کنیم
            } as any);

            if (!request) {
                throw new NotFoundException(await this.i18n.t('shop.request.not_found'));
            }

            if (request.status === 'approved') {
                throw new BadRequestException(await this.i18n.t('shop.request.can_not_revision'));
            }

            request.status = 'needs_revision';
            request.rejectionReason = reason;

            // ذخیره تغییرات در دیتابیس (هنوز کامیت نشده)
            const savedRequest = await queryRunner.manager.save(request);

            // ۱. ارسال نوتیفیکیشن
            // نکته: اگر جدول نوتیفیکیشن‌ها در همین دیتابیس است، بهتر است با queryRunner.manager ذخیره شود
            // تا کاملاً اتمیک باشد. اگر سرویس جداگانه‌ای است و تراکنش جدا دارد،
            // اینجا فقط ذخیره در دیتابیس فروشگاه اتمیک تضمین می‌شود.
            await this.notifService.create({
                userId: request.userId,
                type: NotificationType.IN_APP,
                title: await this.i18n.t('shop.notif.revision_title', { args: { type: getTenantTypeLabel(request.type.toUpperCase())} }),
                message: await this.i18n.t('shop.notif.revision_message',{ args: { type: getTenantTypeLabel(request.type.toUpperCase())} }),
                icon: 'ti ti-alert-circle text-orange-600', // آیکون هشدار نارنجی مناسب‌تر از تیک سبز است
                color: 'bg-orange-100',
                panelType: 'MARKET'//`${request.type}`
            });

            // ۷. افزودن job به صف
            await this.smsQueue.add('handle-send-sms', {
                phoneNumber: savedRequest.user.phoneNumber,
                message:await this.i18n.t('shop.notif.revision_message',{ args: { type: getTenantTypeLabel(request.type.toUpperCase())}}),
            });

            // تایید نهایی تراکنش (Commit)
            await queryRunner.commitTransaction();

            return {
                success: true,
                message: await this.i18n.t('shop.request.revision_success',await this.i18n.t('shop.notif.revision_message',{ args: { type: getTenantTypeLabel(request.type.toUpperCase()) } }),),
                data: savedRequest,
            };

        } catch (err) {
            // در صورت بروز خطا، تغییرات را برگردان (Rollback)
            await queryRunner.rollbackTransaction();
            throw err; // مجدداً خطا را پرتاب کن تا توسط هندلرهای سرور گرفته شود
        } finally {
            // قطع اتصال (Release) برای آزادسازی منابع
            await queryRunner.release();
        }
    }

    /**
     * _Reject a shop request_
     * Sets status to 'rejected' and saves the reason.
     */
    /**
     * _Reject a shop request_
     * Sets status to 'rejected' and saves the reason atomically.
     */
    async rejectShopRequest(requestId: string, reason: string): Promise<{
        data: ShopRequest;
        success: boolean;
        message: string
    }> {
        // ایجاد QueryRunner برای مدیریت تراکنش
        const queryRunner = this.dataSource.createQueryRunner();

        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // یافتن درخواست در داخل تراکنش
            const request = await queryRunner.manager.findOne(ShopRequest, {
                where: { id: requestId },
                relations: ['user']
            } as any);

            if (!request) {
                throw new NotFoundException(await this.i18n.t('shop.request.not_found'));
            }

            if (request.status === 'approved') {
                throw new BadRequestException(await this.i18n.t('shop.request.can_not_reject')); // کلید ترجمه مناسب را قرار دهید
            }

            request.status = 'rejected';
            request.rejectionReason = reason;

            // ذخیره تغییرات
            const savedRequest = await queryRunner.manager.save(request);

            // ۱. ارسال نوتیفیکیشن
            await this.notifService.create({
                userId: request.userId,
                type: NotificationType.IN_APP,
                title: await this.i18n.t('shop.notif.reject_title',{ args: { type: getTenantTypeLabel(request.type.toUpperCase())}}),
                message: await this.i18n.t('shop.notif.reject_message',
                    { args: { reason: reason,type: getTenantTypeLabel(request.type.toUpperCase()) } }),
                icon: 'ti ti-x text-red-600', // آیکون ضربدر قرمز
                color: 'bg-red-100',
                panelType: 'MARKET'//`${request.type}`
            });

            // ۷. افزودن job به صف
            await this.smsQueue.add('handle-send-sms', {
                phoneNumber: savedRequest.user.phoneNumber,
                message:await this.i18n.t('shop.notif.reject_message',
                    { args: { reason: reason,type: getTenantTypeLabel(request.type.toUpperCase()) } }),
            });

            // تایید نهایی تراکنش (Commit)
            await queryRunner.commitTransaction();

            return {
                success: true,
                message: await this.i18n.t('shop.request.reject_success',
                    { args: {type: getTenantTypeLabel(request.type.toUpperCase()) } }), // کلید ترجمه مناسب
                data: savedRequest,
            };

        } catch (err) {
            // در صورت بروز خطا، تغییرات را برگردان (Rollback)
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            // قطع اتصال (Release)
            await queryRunner.release();
        }
    }

    /**
     * دریافت لیست تغییرات در انتظار تایید
     */
    async getPendingShopInfoChanges() {

        return this.pendingShopInfoRepo.find({relations:['tenant']});
    }

    /**
     * تایید، رد یا درخواست اصلاح تغییرات shopInfo توسط مدیر
     */
    async approveShopInfoChange(tenantId: string, status: 'approved' | 'rejected' | 'correction_required', reason?: string) {
        // دریافت درخواست به همراه اطلاعات تننت برای دسترسی به ownerUserId
        const request = await this.pendingShopInfoRepo.findOne({
            where: { tenantId },
            relations: ['tenant'] // لود کردن رلیشن تننت
        });

        if (!request) {
            throw new NotFoundException(await this.i18n.t('shop.market.errors.request_not_found'));
        }

        // استخراج شناسه کاربر مالک از تننت
        const targetUserId = request.tenant?.ownerUserId;

        // متغیرهای مربوط به نوتیفیکیشن و پیامک
        let notifTitle = '';
        let notifMessage = '';
        let notifIcon = '';
        let notifColor = '';
        let smsMessage = '';

        if (status === 'approved') {
            // تعیین کلید تنظیمات بر اساس نوع تننت
            const settingKey = request.tenant.type === TenantType.PHARMACY ? 'pharmacyInfo' : 'shopInfo';

            // دریافت رکورد تنظیمات فعلی
            let settingRecord = await this.settingRepo.findOne({
                where: { tenantId, key: settingKey }
            });


            if (settingRecord) {

                // مرج کردن تغییرات جدید (newValues) روی اطلاعات قبلی
                // توجه: ما فقط newValues را مرج می‌کنیم چون oldValues فقط برای نمایش بود
                settingRecord.value = {
                    ...settingRecord.value,
                    ...request.changes.newValues
                };
                await this.settingRepo.save(settingRecord);
            } else {
                // اگر رکوردی وجود نداشت (حالت نادر)، تغییرات جدید را به عنوان اطلاعات اصلی ذخیره کن
                await this.settingRepo.save({
                    tenantId,
                    key: settingKey, // اصلاح شده: استفاده از settingKey به جای hardcode
                    value: request.changes.newValues
                });
            }

            //////
            const newValues = request.changes.newValues;

            const addressPayload = newValues.address

            if (newValues && newValues.address) {
                // بررسی وجود رکورد آدرس قبلی
                const existingAddress = await this.tenantAddressRepo.findOne({
                    where: {tenantId: request.tenantId}
                });

                if (existingAddress) {

                    // آپدیت رکورد موجود
                    existingAddress.fullAddress = addressPayload.display_name || existingAddress.fullAddress;
                    existingAddress.province = newValues.province || existingAddress.province;
                    existingAddress.city = newValues.city || existingAddress.city;

                    if (addressPayload.lat && addressPayload.lon) {
                        existingAddress.location = {
                            lat: parseFloat(addressPayload.lat),
                            lng: parseFloat(addressPayload.lon)
                        };
                    }

                    // آپدیت فیلدهای OSM و جزئیات آدرس
                    existingAddress.displayName = addressPayload.display_name;
                    existingAddress.placeId = addressPayload.place_id;
                    existingAddress.osmType = addressPayload.osm_type;
                    existingAddress.osmId = addressPayload.osm_id;
                    existingAddress.mapClass = addressPayload.class;
                    existingAddress.mapType = addressPayload.type;
                    existingAddress.placeRank = addressPayload.place_rank;
                    existingAddress.importance = addressPayload.importance;
                    existingAddress.boundingBox = addressPayload.boundingbox;
                    existingAddress.detailedAddress = addressPayload.address; // آبجکت تو در تو

                    // استخراج فیلدهای جزئی
                    if (addressPayload.address) {
                        existingAddress.street = addressPayload.address.road;
                        existingAddress.neighborhood = addressPayload.address.neighbourhood;
                        existingAddress.district = addressPayload.address.district;
                        existingAddress.suburb = addressPayload.address.suburb;
                        existingAddress.county = addressPayload.address.county;
                        existingAddress.postalCode = addressPayload.address.postcode;
                    }

                    await this.tenantAddressRepo.save(existingAddress);
                }
            }


            //////

            // تنظیمات نوتیفیکیشن و پیامک برای حالت تایید
            notifTitle = await this.i18n.t('shop.notif.approve_setting_title');
            notifMessage = await this.i18n.t('shop.notif.approve_setting_message');
            notifIcon = 'ti ti-check text-green-600';
            notifColor = 'bg-green-100';
            smsMessage = await this.i18n.t('shop.sms.approve_setting_message');
        } else {
            // حالت‌های rejected یا correction_required
            if (status === 'rejected') {
                notifTitle = await this.i18n.t('shop.notif.reject_setting_title');
                notifMessage = reason
                    ? await this.i18n.t('shop.notif.reject_setting_message_with_reason', { args: { reason } })
                    : await this.i18n.t('shop.notif.reject_setting_message');
                notifIcon = 'ti ti-x text-red-600';
                notifColor = 'bg-red-100';
                smsMessage = reason
                    ? await this.i18n.t('shop.sms.reject_setting_message_with_reason', { args: { reason } })
                    : await this.i18n.t('shop.sms.reject_setting_message');
            } else if (status === 'correction_required') {
                notifTitle = await this.i18n.t('shop.notif.correction_setting_title');
                notifMessage = reason
                    ? await this.i18n.t('shop.notif.correction_setting_message_with_reason', { args: { reason } })
                    : await this.i18n.t('shop.notif.correction_setting_message');
                notifIcon = 'ti ti-alert-circle text-orange-600';
                notifColor = 'bg-orange-100';
                smsMessage = reason
                    ? await this.i18n.t('shop.sms.correction_setting_message_with_reason', { args: { reason } })
                    : await this.i18n.t('shop.sms.correction_setting_message');
            }
        }

        // ارسال نوتیفیکیشن و پیامک (مشترک برای هر سه حالت)
        if (targetUserId) {
            // ۱. ارسال نوتیفیکیشن
            await this.notifService.create({
                userId: targetUserId,
                type: NotificationType.IN_APP,
                title: notifTitle,
                message: notifMessage,
                icon: notifIcon,
                color: notifColor,
                panelType: 'SHOP-ADMIN'
            });

            // ۲. دریافت اطلاعات کاربر برای ارسال پیامک
            const user = await this.userRepo.findOne({
                where: { id: targetUserId }
            });

            // ۳. افزودن job به صف پیامک
            if (user instanceof User) {
                await this.smsQueue.add('handle-send-sms', {
                    phoneNumber: user.phoneNumber,
                    message: smsMessage
                });
            }
        }

        // در هر صورت (تایید، رد یا درخواست اصلاح)، درخواست را از جدول موقت حذف کن
        await this.pendingShopInfoRepo.delete({ tenantId });

        // پیام پاسخ به ادمین
        let responseMessageKey = '';
        if (status === 'approved') responseMessageKey = 'shop.market.messages.changes_approved';
        else if (status === 'rejected') responseMessageKey = 'shop.market.messages.changes_rejected';
        else if (status === 'correction_required') responseMessageKey = 'shop.market.messages.changes_correction_required';

        return { message: await this.i18n.t(responseMessageKey) };
    }
    /**
     * Delete a shop request
     */
    async remove(id: string): Promise<void> {
        const shop = await this.findOne(id);
        await this.shopRepo.remove(shop);
    }


    /**
     * دریافت لیست نظرات در انتظار تایید
     */
    async findAllPendingReviews(): Promise<any[]> {
        const reviews = await this.reviewRepo.find({
            where: { isApproved: false },
            order: { createdAt: 'DESC' }, // جدیدترین‌ها در بالا
            relations: ['user', 'tenant'] // روابط مورد نیاز برای نمایش نام کاربر و محصول
        });

        return reviews.map(review => ({
            id: review.id,
            rating: review.rating,
            comment: review.comment,
            createdAt: review.createdAt,
            // اطمینان از وجود آبجکت‌های مرتبط قبل از دسترسی
            userName: review.user?.fullName||review.user?.firstName+' '+ review.user?.lastName || 'کاربر ناشناس',
            shopName: review.tenant?.name || 'محصول حذف شده',
            userId: review.userId
        }));
    }

    /**
     * تایید نظر
     */
    async approveReview(reviewId: string): Promise<any> {
        const review = await this.reviewRepo.findOne({ where: { id: reviewId } });
        if (!review) {
            throw new NotFoundException('Review not found');
        }

        review.isApproved = true;
        await this.reviewRepo.save(review);

        return { message: 'Review approved successfully', review };
    }

    /**
     * رد نظر
     */
    async rejectReview(reviewId: string): Promise<any> {
        const review = await this.reviewRepo.findOne({ where: { id: reviewId } });
        if (!review) {
            throw new NotFoundException('Review not found');
        }

        // حذف نظر از دیتابیس
        await this.reviewRepo.remove(review);

        return { message: 'Review rejected and removed successfully' };
    }

    /**
     * تغییر وضعیت محدودیت (Suspend/Unsuspend) فروشگاه
     * @param id شناسه فروشگاه (Tenant)
     * @param isSuspended وضعیت جدید (true برای محدود، false برای فعال)
     */
    async toggleTenantSuspension(id: string, isSuspended: boolean): Promise<{
        success: boolean;
        message: string;
        data: Tenant;
    }> {
        // ۱. بررسی وجود فروشگاه
        const tenant = await this.tenantRepo.findOne({ where: { id } });
        if (!tenant) {
            throw new NotFoundException(await this.i18n.t('shop.market.errors.tenant_not_found'));
        }

        // ۲. آپدیت وضعیت
        // اگر وضعیت جدید با وضعیت فعلی یکی باشد، نیازی به دیتابیس نیست
        if (tenant.isSuspended === isSuspended) {
            return {
                success: true,
                message: await this.i18n.t('shop.market.messages.status_unchanged'),
                data: tenant
            };
        }

        // انجام آپدیت
        tenant.isSuspended = isSuspended;
        const updatedTenant = await this.tenantRepo.save(tenant);

        // ۳. ارسال نوتیفیکیشن به مالک فروشگاه
        let notifTitle = '';
        let notifMessage = '';
        let notifIcon = '';
        let notifColor = '';

        if (isSuspended) {
            // پیام‌های مربوط به محدود شدن
            notifTitle = await this.i18n.t('shop.notif.suspend_title');
            notifMessage = await this.i18n.t('shop.notif.suspend_message');
            notifIcon = 'ti ti-ban text-red-600';
            notifColor = 'bg-red-100';
        } else {
            // پیام‌های مربوط به فعال شدن مجدد
            notifTitle = await this.i18n.t('shop.notif.unsuspend_title');
            notifMessage = await this.i18n.t('shop.notif.unsuspend_message');
            notifIcon = 'ti ti-check text-green-600';
            notifColor = 'bg-green-100';
        }

        await this.notifService.create({
            userId: tenant.ownerUserId,
            type: NotificationType.IN_APP,
            title: notifTitle,
            message: notifMessage,
            icon: notifIcon,
            color: notifColor,
            panelType: 'SHOP-ADMIN'
        });

        // ۴. (اختیاری) ارسال پیامک به مالک فروشگاه
        // ابتدا اطلاعات کاربر را بگیرید
        const user = await this.userRepo.findOne({ where: { id: tenant.ownerUserId } });
        if (user) {
            const smsMessage = isSuspended
                ? await this.i18n.t('shop.sms.suspend_message')
                : await this.i18n.t('shop.sms.unsuspend_message');

            await this.smsQueue.add('handle-send-sms', {
                phoneNumber: user.phoneNumber,
                message: smsMessage
            });
        }

        return {
            success: true,
            message: isSuspended
                ? await this.i18n.t('shop.market.messages.shop_suspended')
                : await this.i18n.t('shop.market.messages.shop_activated'),
            data: updatedTenant
        };
    }

    async findAllWithdrawals() {

        return this.withdrawalsRepository.find({
            /*where: {status:WithdrawalStatus.PENDING},*/
            order: {createdAt: 'DESC'},
            relations:['wallet','user','tenant']
        } as any);
    }

    async updateWithdrawalStatus(
        id: string,
        status: WithdrawalStatus,
        rejectionReason?: string,
        trackId?: string,
        paidAt?: string
    ) {
        const withdrawal = await this.withdrawalsRepository.findOne({
            where: { id },
            relations: ['wallet']
        });
        if (!withdrawal) throw new NotFoundException('درخواست یافت نشد');
        if (withdrawal.status === WithdrawalStatus.COMPLETED || withdrawal.status === WithdrawalStatus.REJECTED) {
            throw new BadRequestException('این درخواست قبلاً پردازش شده است');
        }

        withdrawal.status = status;
        // اگر درخواست رد شد
        if (status === WithdrawalStatus.REJECTED) {
            // استفاده از تراکنش برای اطمینان از یکپارچگی برگشت وجه و ثبت تراکنش
            const queryRunner = this.dataSource.createQueryRunner();
            await queryRunner.connect();
            await queryRunner.startTransaction();

            try {
                // دریافت مجدد والت در محیط تراکنش برای جلوگیری از Concurrency Issues
                const wallet = await queryRunner.manager.findOne(Wallet, {
                    where: { id: withdrawal.wallet.id }
                }as any);

                if (!wallet) throw new NotFoundException('کیف پول یافت نشد');

                // ثبت تراکنش برگشت وجه (Credit) در جدول تراکنش‌ها و افزایش موجودی
                await this.walletService.executeTransaction(
                    queryRunner.manager,
                    wallet,
                    WalletTransactionType.CREDIT, // نوع تراکنش: برگشت وجه
                    withdrawal.amount,
                    `برگشت وجه برداشت رد شده: ${rejectionReason || 'بدون دلیل'}`, // توضیحات
                    undefined, // referenceId
                    undefined  // relatedWalletId
                );

                // ذخیره وضعیت درخواست برداشت
                withdrawal.note = `${withdrawal.note || ''} | دلیل رد: ${rejectionReason}`;
                await queryRunner.manager.save(withdrawal);

                await queryRunner.commitTransaction();
            } catch (err) {
                await queryRunner.rollbackTransaction();
                throw err;
            } finally {
                await queryRunner.release();
            }
        }
        // اگر درخواست تایید و پرداخت شد
        else if (status === WithdrawalStatus.COMPLETED) {
            if (trackId && paidAt) {
                withdrawal.trackId=trackId;
                withdrawal.note = `${withdrawal.note || ''} | کد رهگیری: ${trackId} | تاریخ پرداخت: ${paidAt}`;
            }
            return this.withdrawalsRepository.save(withdrawal);
        }

        return this.withdrawalsRepository.save(withdrawal);
    }
}