import {BadRequestException, Injectable, NotFoundException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {DataSource, In, Repository} from 'typeorm';

import {I18nService} from "nestjs-i18n";
import {InjectQueue} from "@nestjs/bull";
import {Queue} from "bull";
import {TenantRequest} from "../entities/tenant-request.entity";
import {NotificationService} from "../../notification/notification.service";
import {Withdrawal} from "../../../modules/market/request/entities/withdrawal.entity";
import {Wallet} from "../../wallet/wallet.entity";
import {User} from "../../user/entities/user.entity";
import {TenantProvisioningService} from "../../../tenants/tenant-provisioning.service";
import {SettingKey, TenantSetting} from "../entities/tenant-setting.entity";
import {Tenant, TenantType} from "../../../core/entities/tenant.entity";
import {NotificationType} from "../../notification/notification.entity";
import {RequestStatus, TenantSettingChangeRequest} from "../entities/tenant-setting-change-request.entity";
import {ServiceStatus, VetClinicServiceEntity} from "../../../modules/vet&clinic/entities/service.entity";
import {ProcessServiceDto} from "../dto/process-service.dto";
import {Order} from "../../order/order.entity";
import {ListOrdersQuery} from "../../order/list-orders.query";
import {PharmacyMedicine, PharmacyMedicineStatus} from "../../../modules/pharmacy/medicine/pharmacy-medicine.entity";
import {Medicine, MedicineStatus} from "../../medicine/medicine.entity";
import {TenantSpecialty} from "../../../core/entities/tenant-specialty.entity";
import {TenantAddress} from "../../../core/entities/tenant-address.entity";
import {TenantCategory} from "../../../modules/market/category/tenant-category.entity";
import {MarketSetting} from "../../../modules/market/settings/market-setting.entity";
import {getTenantTypeLabel} from "../../../common/helper/helpers";


@Injectable()
export class AdminTenantService {
    constructor(
        private readonly i18n: I18nService,
        private dataSource: DataSource,
        private notifService: NotificationService,
        @InjectQueue('send-sms') private smsQueue: Queue, // تزریق صف
        @InjectRepository(TenantRequest) private tenantReqRepo: Repository<TenantRequest>,
        @InjectRepository(Withdrawal) private withdrawalsRepository: Repository<Withdrawal>,
        @InjectRepository(Wallet) private walletRepository: Repository<Wallet>,
        @InjectRepository(User) private userRepo: Repository<User>,
        @InjectRepository(TenantSpecialty) private specialtyRepo: Repository<TenantSpecialty>,
        @InjectRepository(TenantAddress) private tenantAddressRepo: Repository<TenantAddress>,
        private readonly tenantProvisioningService: TenantProvisioningService,
        @InjectRepository(TenantSetting) private settingRepo: Repository<TenantSetting>,
        @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
        @InjectRepository(TenantSetting) private tenantSettingRepository: Repository<TenantSetting>,
        @InjectRepository(TenantSettingChangeRequest) private changeRequestRepository: Repository<TenantSettingChangeRequest>,
        @InjectRepository(VetClinicServiceEntity)
        private vetClinicServiceRepository: Repository<VetClinicServiceEntity>,
        @InjectRepository(Order)
        private orderRepository: Repository<Order>,
        @InjectRepository(PharmacyMedicine)
        private pharmacyMedicineRepo: Repository<PharmacyMedicine>,
        @InjectRepository(Medicine)
        private medicineRepo: Repository<Medicine>,
        @InjectRepository(TenantCategory) private categoryRepo: Repository<TenantCategory>,
    ) {
    }

    /**
     * Retrieve all tenants of type CLINIC or VET
     */
    async findAllTenant(): Promise<Tenant[]> {
        // ۱. دریافت لیست تننت‌ها بدون لود کردن categories (برای جلوگیری از خطای رابطه و کنترل دستی)
        // ما فقط روابط سبک و یک‌به‌یک را لود می‌کنیم.
        const tenants = await this.tenantRepo.find({
            relations: [
                'marketProducts',
                'tenantSettings',
                'tenantAddress',
                'appointments',
                // 'categories' را اینجا لود نمی‌کنیم تا بتوانیم دستی پردازش کنیم
            ],
        });

        // اگر تننتی وجود نداشت، همان را برگردان
        if (!tenants || tenants.length === 0) {
            return tenants;
        }

        // شناسایی ID تننت‌ها برای استفاده در کوئری دوم
        const tenantIds = tenants.map(t => t.id);

        // ۲. استخراج تمام UUIDهای دسته‌بندی‌ها از تمام تننت‌ها
        const allCategoryIds = new Set<string>();
        tenants.forEach(tenant => {
            if (tenant.categories && Array.isArray(tenant.categories)) {
                tenant.categories.forEach((catId: string) => {
                    if (catId) allCategoryIds.add(catId);
                });
            }
        });

        const uniqueCategoryIds = Array.from(allCategoryIds);

        // ۳. دریافت اطلاعات دسته‌بندی‌ها (فقط id و title)
        let categoryMap: Record<string, string> = {}; // Map برای ذخیره UUID -> Title
        if (uniqueCategoryIds.length > 0) {
            // فرض بر این است که Entity شما Category است و فیلد نام آن title یا name است
            const categories = await this.categoryRepo.find({
                where: {id: In(uniqueCategoryIds)},
                select: ['id', 'title'] // یا 'name' بسته به فیلد شما
            });

            categoryMap = categories.reduce((acc, cat) => {
                acc[cat.id] = cat.title; // فقط نام را نگه می‌داریم
                return acc;
            }, {} as Record<string, string>);
        }

        // ۴. دریافت روابط "سنگین" و پیچیده در یک کوئری جداگانه
        const heavyData = await this.tenantRepo.find({
            where: {
                id: In(tenantIds)
            },
            relations: [
                'orders.transaction',
                'orders.items',
                'tenantReviews.user',
                'wallet.transactions',
            ],
        });

        // ۵. ادغام (Merge) کردن داده‌های سنگین
        const heavyDataMap = new Map(heavyData.map(t => [t.id, t]));

        // ۶. پردازش نهایی و بازگرداندن داده‌ها با فرمت درخواستی
        return tenants.map(tenant => {
            const heavyInfo = heavyDataMap.get(tenant.id);

            if (heavyInfo) {
                tenant.orders = heavyInfo.orders;
                tenant.tenantReviews = heavyInfo.tenantReviews;
                tenant.wallet = heavyInfo.wallet;
            }

            if (tenant.categories && Array.isArray(tenant.categories)) {
                tenant.categories = tenant.categories.map((catId: string) => {
                    // اگر نام دسته‌بندی پیدا شد، نام را برگردان، وگرنه خود UUID یا یک مقدار پیش‌فرض
                    return categoryMap[catId] || catId;
                });
            } else {
                tenant.categories = [];
            }

            return tenant;
        });
    }

    /**
     * Retrieve all shop requests
     */
    async findAllOrders(query: ListOrdersQuery) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const skip = (page - 1) * limit;

        const qb = this.dataSource
            .getRepository(Order)
            .createQueryBuilder('order')
            .leftJoinAndSelect('order.user', 'user')
            .leftJoinAndSelect('order.address', 'address')
            .leftJoinAndSelect('order.items', 'items')
            .leftJoinAndSelect('order.tenant', 'tenant')
        ;

        const [orders, total] = await qb
            .orderBy('order.createdAt', 'DESC')
            .skip(skip)
            .take(limit)
            .getManyAndCount();

        return {
            page,
            limit,
            total,
            data: orders.map((order) => ({
                id: order.id,
                orderCode: order.orderCode,
                status: order.status,
                totalAmount: order.totalAmount,
                metadata: order.metadata,
                note: order.note,
                user: order.user,
                tenant: order.tenant,
                items: order.items,
                address: order.address,
                createdAt: order.createdAt,
            })),
        };
    }

    /**
     * Retrieve all shop requests
     */
    async findAll(): Promise<any[]> {
        // 1. دریافت تمام درخواست‌های تِنت
        const tenantRequests = await this.tenantReqRepo.find({
            where: {status: 'pending'}
        });

        // 2. اگر هیچ درخواستی وجود ندارد، بلافاصله برگردان
        if (tenantRequests.length === 0) {
            return [];
        }

        // 3. استخراج تمام IDهای تخصص از تمام رکوردها
        // توجه: برخی رکوردها ممکن است specialty نداشته باشند (null یا undefined)
        const allSpecialtyIds = tenantRequests
            .map(req => req.specialty)
            .filter(id => id != null && id !== ''); // حذف null و undefined

        // 4. اگر تخصصی وجود داشت، نام آن‌ها را از دیتابیس بگیر
        let specialtyMap: Record<string, string> = {};
        if (allSpecialtyIds.length > 0) {
            const specialties = await this.specialtyRepo.find({
                where: {id: In(allSpecialtyIds)},
                select: ['id', 'label'] // فقط ID و نام نمایشی (label) را بگیر
            });

            // تبدیل لیست به یک آبجکت برای دسترسی سریع: { 'uuid': 'نام تخصص' }
            specialtyMap = specialties.reduce((acc, spec) => {
                acc[spec.id] = spec.label;
                return acc;
            }, {} as Record<string, string>);
        }
        // 5. جایگزینی IDها با نام‌ها در پاسخ نهایی
        return tenantRequests.map(req => {
            // کپی آبجکت برای جلوگیری از تغییر مستقیم در Entity (اگر کشینگ فعال باشد مهم است)
            const plainReq = {...req};

            // اگر تخصص وجود داشت، آن را با نام جایگزین کن، وگرنه نگه دار یا null بگذار
            if (plainReq.specialty) {
                plainReq.specialty = specialtyMap[plainReq.specialty] || plainReq.specialty;
            }

            return plainReq;
        });
    }

    /**
     * Find a single shop request by ID
     */
    async findOne(id: string): Promise<TenantRequest> {
        const request = await this.tenantReqRepo.findOne({where: {id}});
        if (!request) {
            throw new NotFoundException(`Tenant request with ID ${id} not found`);
        }
        return request;
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
        // ۱. بررسی وجود تنت
        const tenant = await this.tenantRepo.findOne({where: {id}});
        if (!tenant) {
            throw new NotFoundException(await this.i18n.t('tenant.errors.tenant_not_found'));
        }

        // ۲. آپدیت وضعیت
        // اگر وضعیت جدید با وضعیت فعلی یکی باشد، نیازی به دیتابیس نیست
        if (tenant.isSuspended === isSuspended) {
            return {
                success: true,
                message: await this.i18n.t('tenant.messages.status_unchanged'),
                data: tenant
            };
        }

        // انجام آپدیت
        tenant.isSuspended = isSuspended;
        const updatedTenant = await this.tenantRepo.save(tenant);
        console.log('updatedTenant', updatedTenant.isSuspended)

        // ۳. ارسال نوتیفیکیشن به مالک فروشگاه
        let notifTitle = '';
        let notifMessage = '';
        let notifIcon = '';
        let notifColor = '';

        if (isSuspended) {
            // پیام‌های مربوط به محدود شدن
            notifTitle = await this.i18n.t('tenant.notif.suspend_title');
            notifMessage = await this.i18n.t('tenant.notif.suspend_message');
            notifIcon = 'ti ti-ban text-red-600';
            notifColor = 'bg-red-100';
        } else {
            // پیام‌های مربوط به فعال شدن مجدد
            notifTitle = await this.i18n.t('tenant.notif.unsuspend_title');
            notifMessage = await this.i18n.t('tenant.notif.unsuspend_message');
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
            panelType: 'TENANT-ADMIN'
        });

        // ۴. (اختیاری) ارسال پیامک به مالک فروشگاه
        // ابتدا اطلاعات کاربر را بگیرید
        const user = await this.userRepo.findOne({where: {id: tenant.ownerUserId}});
        if (user) {
            const smsMessage = isSuspended
                ? await this.i18n.t('tenant.sms.suspend_message')
                : await this.i18n.t('tenant.sms.unsuspend_message');

            await this.smsQueue.add('handle-send-sms', {
                phoneNumber: user.phoneNumber,
                message: smsMessage
            });
        }

        return {
            success: true,
            message: isSuspended
                ? await this.i18n.t('tenant.messages.shop_suspended')
                : await this.i18n.t('tenant.messages.shop_activated'),
            data: updatedTenant
        };
    }

    /**
     * _Approve a shop request:_
     * 1. Uses TenantProvisioningService to create the base Tenant.
     * 2. Updates the Tenant with shop-specific details.
     * 3. Marks the request as approved.
     * (Atomic Transaction Implementation)
     */
    async approveTenantRequest(requestId: string, adminId: string): Promise<{
        data: Tenant;
        success: boolean;
        message: string
    }> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Find the request inside transaction
            const request = await queryRunner.manager.findOne(TenantRequest, {
                where: {id: requestId},
                relations: ['user']
            } as any);

            if (!request) {
                throw new NotFoundException(await this.i18n.t('tenant.request.not_found'));
            }
            if (request.status === 'approved') {
                throw new BadRequestException(await this.i18n.t('tenant.request.already_approved'));
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
                request.tenantName??request.name,
                request.type.toUpperCase() as TenantType,
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

            const address = await queryRunner.manager.save(tenantAddress);

            // 3. Update the newly created Tenant with shop details inside transaction
            const updateData: Partial<Tenant> = {
                ownerName: request.name,
                specialty: request.specialty,
                services: request.services,
                description: request.description,
                phone: request.phone,
                email: request.email,
                address: request.address,
                province: request.province,
                city: request.city,
                iban: request.iban,
                documents: request.documents
            };

            if (request.location) {
                updateData.location = request.location;
            }
            if (request.services) {
                updateData.services = request.services;
            }

            // آپدیت کردن Tenant در داخل تراکنش
            await queryRunner.manager.update(Tenant, tenant.id, updateData);

            // 4. Update request status inside transaction
            request.status = 'approved';
            const savedRequest = await queryRunner.manager.save(request);

            // 5. Fetch updated tenant to return
            const updatedTenant = await queryRunner.manager.findOne(Tenant, {
                where: {id: tenant.id},
                relations: ['tenantUsers']
            } as any);

            if (!updatedTenant) {
                throw new NotFoundException('Tenant creation failed .');
            }

            updatedTenant.tenantAddress = address

            // 1. تعریف داده‌های shopInfo
            const defaultTenantInfoData = {
                name: request.tenantName || "",
                ownerName: request.name || "نام مالک",
                mobile: request.phone || "",
                phone: request.phone || "",
                email: request.email || "info@example.com",
                address: request.address || "",
                city: request.city || "",
                province: request.province || "",
                postalCode: request.address.postalCode || "",
                logo: request.documents.logo?.thumbnail??request.documents.personalPhoto?.thumbnail,
                isApproved: true,
                pendingChanges: false,
                description: request.description,
                website: "",
                licenseNumber: "",
                medicalSystemCode: "",
                ownerNationalId: "",
                specialty: request.specialty,
                experience: request.experience,
                education: [],
                specialties: [],
                services: request.services,
                openTime: "09:00",
                closeTime: "21:00",
                closedDays: ["friday"],
                is24Hours: false
            };


            if (updatedTenant.type === TenantType.VET || updatedTenant.type === TenantType.CLINIC) {

                const defaultVisitPricingSetting = {
                    inPerson: {
                        enabled: true,
                        price: "100000"
                    },
                    home: {
                        enabled: true,
                        price: "200000"
                    },
                    chat: {
                        enabled: true,
                        price: "300000"
                    },
                    phoneInstant: {
                        enabled: true,
                        price: "400000"
                    }
                }

                const defaultPhoneScheduleSettings = {
                    enabled: true,
                    options: {
                        min15: {
                            enabled: true,
                            price: "100000"
                        },
                        min30: {
                            enabled: true,
                            price: "200000"
                        },
                        hour1: {
                            enabled: true,
                            price: "300000"
                        },
                        custom: {
                            enabled: true,
                            price: "400000"
                        }
                    }
                }
                // رکورد اول: tenantInfo
                const tenantInfoSetting = queryRunner.manager.create(TenantSetting, {
                    tenantId: tenant.id,
                    key: SettingKey.CLINIC_INFO,
                    value: defaultTenantInfoData
                });
                await queryRunner.manager.save(tenantInfoSetting);

                // رکورد دوم: visit_pricing
                const visitPricingSetting = queryRunner.manager.create(TenantSetting, {
                    tenantId: tenant.id,
                    key: SettingKey.VISIT_PRICING,
                    value: defaultVisitPricingSetting
                });

                await queryRunner.manager.save(visitPricingSetting);

                // رکورد سوم: phone_schedule
                const phoneScheduleSetting = queryRunner.manager.create(TenantSetting, {
                    tenantId: tenant.id,
                    key: SettingKey.PHONE_SCHEDULE,
                    value: defaultPhoneScheduleSettings
                });

                await queryRunner.manager.save(phoneScheduleSetting);

            } else if (updatedTenant.type === TenantType.PHARMACY) {

                const tenantInfoSetting = queryRunner.manager.create(MarketSetting, {
                    tenantId: tenant.id,
                    key: 'pharmacyInfo',
                    value: defaultTenantInfoData
                });
                await queryRunner.manager.save(tenantInfoSetting);


                const defaultShippingMethodsData = {
                    methods: [
                        {type: "inPerson", isActive: true, deliveryTime: "فوری", price: 0},
                        {type: "petomanCourier", isActive: true, deliveryTime: "1 تا 2 ساعت", price: 40000},
                        {type: "shopCourier", isActive: true, deliveryTime: "2 تا 4 ساعت", price: 30000},
                        {type: "tipax", isActive: true, deliveryTime: "1 تا 2 روز کاری", price: 60000},
                        {type: "alopeyk", isActive: true, deliveryTime: "1 تا 2 روز کاری", price: 50000},
                        {type: "post", isActive: true, deliveryTime: "3 تا 5 روز کاری", price: 30000}
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

            }


            await queryRunner.manager.save(updatedTenant)

            // ۶. ارسال نوتیفیکیشن
            await this.notifService.create({
                userId: request.userId,
                type: NotificationType.IN_APP,
                title: await this.i18n.t('tenant.notif.approve_title', {args: {type: getTenantTypeLabel(request.type.toUpperCase())}}),
                message: await this.i18n.t('tenant.notif.approve_message', {
                    args: {
                        shopId: updatedTenant.tenantUsers.find((t) => t.tenantId === updatedTenant.id)?.shopId,
                        type: getTenantTypeLabel(request.type.toUpperCase())
                    }
                }),
                icon: 'ti ti-check text-green-600',
                color: 'bg-green-100',
                panelType: 'VET-CLINIC-PHARMACY'//`${request.type}`
            });

            // ۷. افزودن job به صف
            await this.smsQueue.add('handle-send-sms', {
                phoneNumber: savedRequest.user.phoneNumber,
                message: await this.i18n.t('tenant.notif.approve_message', {
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
                message: await this.i18n.t('tenant.request.approve_success',
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
    async revisionTenantRequest(requestId: string, reason: string): Promise<{
        data: TenantRequest;
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
            const request = await queryRunner.manager.findOne(TenantRequest, {
                where: {id: requestId},
                relations: ['user'] // برای جلوگیری از کوئری اضافه، اینجا رلیشن را لود می‌کنیم
            } as any);

            if (!request) {
                throw new NotFoundException(await this.i18n.t('tenant.request.not_found'));
            }

            if (request.status === 'approved') {
                throw new BadRequestException(await this.i18n.t('tenant.request.can_not_revision'));
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
                title: await this.i18n.t('tenant.notif.revision_title', {args: {type: getTenantTypeLabel(request.type.toUpperCase())}}),
                message: await this.i18n.t('tenant.notif.revision_message', {args: {type: getTenantTypeLabel(request.type.toUpperCase())}}),
                icon: 'ti ti-alert-circle text-orange-600', // آیکون هشدار نارنجی مناسب‌تر از تیک سبز است
                color: 'bg-orange-100',
                panelType: 'VET-CLINIC-PHARMACY'//`${request.type}`
            });

            // ۷. افزودن job به صف
            await this.smsQueue.add('handle-send-sms', {
                phoneNumber: savedRequest.user.phoneNumber,
                message: await this.i18n.t('tenant.notif.revision_message', {args: {type: getTenantTypeLabel(request.type.toUpperCase())}}),
            });

            // تایید نهایی تراکنش (Commit)
            await queryRunner.commitTransaction();

            return {
                success: true,
                message: await this.i18n.t('tenant.request.revision_success', {args: {type: getTenantTypeLabel(request.type.toUpperCase())}}),
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
     * Sets status to 'rejected' and saves the reason atomically.
     */
    async rejectTenantRequest(requestId: string, reason: string): Promise<{
        data: TenantRequest;
        success: boolean;
        message: string
    }> {
        // ایجاد QueryRunner برای مدیریت تراکنش
        const queryRunner = this.dataSource.createQueryRunner();

        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // یافتن درخواست در داخل تراکنش
            const request = await queryRunner.manager.findOne(TenantRequest, {
                where: {id: requestId},
                relations: ['user']
            } as any);

            if (!request) {
                throw new NotFoundException(await this.i18n.t('tenant.request.not_found'));
            }

            if (request.status === 'approved') {
                throw new BadRequestException(await this.i18n.t('tenant.request.can_not_reject')); // کلید ترجمه مناسب را قرار دهید
            }

            request.status = 'rejected';
            request.rejectionReason = reason;

            // ذخیره تغییرات
            const savedRequest = await queryRunner.manager.save(request);

            // ۱. ارسال نوتیفیکیشن
            await this.notifService.create({
                userId: request.userId,
                type: NotificationType.IN_APP,
                title: await this.i18n.t('tenant.notif.reject_title',
                    {args: {type: getTenantTypeLabel(request.type.toUpperCase())}}),
                message: await this.i18n.t('tenant.notif.reject_message',
                    {args: {reason: reason, type: getTenantTypeLabel(request.type.toUpperCase())}}),
                icon: 'ti ti-x text-red-600', // آیکون ضربدر قرمز
                color: 'bg-red-100',
                panelType: 'VET-CLINIC-PHARMACY'//`${request.type}`
            });

            // ۷. افزودن job به صف
            await this.smsQueue.add('handle-send-sms', {
                phoneNumber: savedRequest.user.phoneNumber,
                message: await this.i18n.t('tenant.notif.reject_message',
                    {args: {reason: reason, type: getTenantTypeLabel(request.type.toUpperCase())}}),
            });

            // تایید نهایی تراکنش (Commit)
            await queryRunner.commitTransaction();

            return {
                success: true,
                message: await this.i18n.t('tenant.request.reject_success',
                    {args: {type: getTenantTypeLabel(request.type.toUpperCase())}}), // کلید ترجمه مناسب
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


    ////////////////////===============  Tenant Settings Change ==============//////////////////
    // ----------------------------------------------------------------
    // ۳. متدهای پنل مدیریت (Admin Panel)
    // ----------------------------------------------------------------

    /**
     * دریافت لیست تمام درخواست‌های تغییر در انتظار تایید
     */
    async getPendingChangeRequests() {
        return this.changeRequestRepository.find({
            where: {status: RequestStatus.PENDING},
            order: {createdAt: 'DESC'},
            relations: ['tenant']
        });
    }

    /**
     * تایید یا رد کردن یک درخواست خاص توسط مدیر
     * اگر تایید شود، تغییرات در جدول اصلی (TenantSetting) اعمال می‌شود.
     */
    async processChangeRequest(requestId: string, isApproved: boolean, reason?: string) {
        const request = await this.changeRequestRepository.findOne({
            where: {id: requestId}
        });

        if (!request || request.status !== RequestStatus.PENDING) {
            throw new NotFoundException('درخواست یافت نشد یا قبلاً پردازش شده است.');
        }

        if (isApproved) {
            // استفاده از QueryBuilder برای آپدیت امن و اتمیک (اختیاری اما بهتر)
            // اینجا از روش ساده save استفاده می‌کنیم

            let setting = await this.tenantSettingRepository.findOne({
                where: {tenantId: request.tenantId, key: request.key}
            });

            if(request.proposedValue.specialty){
                let tenant=await this.tenantRepo.findOne({
                    where:{
                        id:request.tenantId
                    }
                })

                if (tenant instanceof Tenant) {
                    tenant.specialty = request.proposedValue.specialty
                    await this.tenantRepo.save(tenant)
                }

            }

            if (setting) {
                setting.value = request.proposedValue;
                await this.tenantSettingRepository.save(setting);
            } else {
                setting = this.tenantSettingRepository.create({
                    tenantId: request.tenantId,
                    key: request.key,
                    value: request.proposedValue
                });
                await this.tenantSettingRepository.save(setting);
            }

            // تغییر وضعیت درخواست به APPROVED
            request.status = RequestStatus.APPROVED;

            const proposedValue = request.proposedValue;

            const addressPayload = proposedValue.address

            if (proposedValue && proposedValue.address) {
                // بررسی وجود رکورد آدرس قبلی
                const existingAddress = await this.tenantAddressRepo.findOne({
                    where: {tenantId: request.tenantId}
                });

                if (existingAddress) {

                    // آپدیت رکورد موجود
                    existingAddress.fullAddress = addressPayload.display_name || existingAddress.fullAddress;
                    existingAddress.province = proposedValue.province || existingAddress.province;
                    existingAddress.city = proposedValue.city || existingAddress.city;

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


        } else {
            // تغییر وضعیت درخواست به REJECTED
            request.status = RequestStatus.REJECTED;
            request.rejectionReason = reason || 'بدون دلیل';
        }

        await this.changeRequestRepository.save(request);

        return {
            message: isApproved ? 'تغییرات با موفقیت اعمال شد.' : 'درخواست رد شد.'
        };
    }

    /**
     * دریافت لیست خدمات فعال و در انتظار تایید
     */
    async getPendingServices() {
        return this.vetClinicServiceRepository.find({
            where: {status: ServiceStatus.PENDING},
            order: {createdAt: 'DESC'}
        });
    }

    /**
     * تایید یا رد کردن درخواست تغییر وضعیت سرویس
     */
    async processServiceStatus(serviceId: string, processDto: ProcessServiceDto) {
        const service = await this.vetClinicServiceRepository.findOne({
            where: {id: serviceId}
        });

        if (!service) {
            throw new NotFoundException('خدمت یافت نشد');
        }

        if (processDto.isApproved) {
            // اگر تایید شد، وضعیت را فعال می‌کنیم
            service.status = ServiceStatus.ACTIVE;
        } else {
            // اگر رد شد، وضعیت را غیرفعال می‌کنیم (یا به حالت قبل برمی‌گردانیم)
            service.status = ServiceStatus.INACTIVE;
            service.reason = processDto.reason
            // می‌توانید دلیل رد را در یک فیلد جداگانه ذخیره کنید
        }

        return await this.vetClinicServiceRepository.save(service);
    }

    /////////////////     MEDICINES MANAGEMENT   //////

    /**
     * Retrieve all pharmacyMedicines
     */
    async findAllPendingMedicines(): Promise<any[]> {
        const pharmacyMedicines = await this.pharmacyMedicineRepo.find({
            where: {status: PharmacyMedicineStatus.PENDING},
            relations: ['tenant', 'medicine']
        });


        return pharmacyMedicines.map(pm => this.mapToResponseObject(pm, pm.medicine));
    }

    private mapToResponseObject(pharmacyMedicine: PharmacyMedicine, baseMedicine: Medicine): any {
        if (!baseMedicine) return pharmacyMedicine;

        return {
            // --- Tenant-Specific Fields ---
            id: pharmacyMedicine.id,
            tenantId: pharmacyMedicine.tenantId,
            price: pharmacyMedicine.price,
            stock: pharmacyMedicine.stock,
            isActive: pharmacyMedicine.isActive,
            hasDiscount: pharmacyMedicine.hasDiscount,
            discountValue: pharmacyMedicine.discountValue,
            discountType: pharmacyMedicine.discountType,
            discountedPrice: pharmacyMedicine.discountedPrice,
            expiryDate: pharmacyMedicine.expiryDate,
            rejectionReason: pharmacyMedicine.rejectionReason,
            status: pharmacyMedicine.status,
            createdAt: pharmacyMedicine.createdAt,
            updatedAt: pharmacyMedicine.updatedAt,
            tenant: pharmacyMedicine.tenant.ownerName,

            // --- Global Fields (Merged from Base Product) ---
            name: baseMedicine.name,
            code: baseMedicine.code,
            description: baseMedicine.description,
            image: baseMedicine.image,
            galleryImages: baseMedicine.galleryImages,
            prescriptionRequired: baseMedicine.prescriptionRequired,
            category: baseMedicine.category,
            categoryBreadcrumb: baseMedicine.categoryBreadcrumb,
            rejectionReasonGlobal: baseMedicine.rejectionReason,
            type: baseMedicine.type,
            //status: baseProduct.status
        };
    }

    /**
     * Approve a medicine request:
     * Updates status in both PharmacyMedicine and global Medicine tables.
     */
    async approveMedicine(medicineId: string): Promise<any> {

        return this.dataSource.transaction(async (manager) => {
            // 1. Find the market product
            const pharmacyMedicine = await manager.findOne(PharmacyMedicine, {
                where: {id: medicineId},
                relations: ['tenant', 'medicine']
            } as any);

            if (!pharmacyMedicine) {
                throw new NotFoundException(await this.i18n.t('medicine.not_found'));
            }
            if (pharmacyMedicine.status === PharmacyMedicineStatus.APPROVED) {
                throw new BadRequestException(await this.i18n.t('medicine.already_approved'));
            }

            // 2. Update status in MarketProduct table
            pharmacyMedicine.status = PharmacyMedicineStatus.APPROVED;
            await manager.save(pharmacyMedicine);

            // 3. Update status in global Product table (if exists and belongs to same tenant)
            if (pharmacyMedicine.medicine) {
                const globalMedicine = await manager.findOne(Medicine, {
                    where: {
                        id: pharmacyMedicine.medicine.id,
                        tenantId: pharmacyMedicine.tenantId
                    }
                } as any);


                if (globalMedicine && globalMedicine.status !== MedicineStatus.APPROVED) {
                    globalMedicine.status = MedicineStatus.APPROVED;
                    globalMedicine.rejectionReason = '';
                    await manager.save(globalMedicine);
                }
            }

            // ۱. ارسال نوتیفیکیشن
            await this.notifService.create({
                userId: pharmacyMedicine.tenant.ownerUserId,
                type: NotificationType.IN_APP,
                title: await this.i18n.t('medicine.notif.success_title',
                    { args: { name: String(pharmacyMedicine.medicine.name)}}),
                message: await this.i18n.t('medicine.notif.success_message',
                    { args: { name: String(pharmacyMedicine.medicine.name) } }),
                icon: 'ti ti-check text-green-600',
                color: 'bg-green-100',
                statusLabel:'success',
                panelType: `${pharmacyMedicine.tenant.type}-ADMIN`
            });

            // ۷. افزودن job به صف
            await this.smsQueue.add('handle-send-sms', {
                phoneNumber: pharmacyMedicine.tenant.phone,
                message:await this.i18n.t('medicine.notif.success_message',
                    { args: { name: String(pharmacyMedicine.medicine.name) } }),
            });

            // 4. Return mapped response
            return this.mapToResponseObject(pharmacyMedicine, pharmacyMedicine.medicine);
        });
    }

    async revisionMedicine(productId: string, reason: string): Promise<any> {

        const pharmacyMedicine = await this.pharmacyMedicineRepo.findOne({
            where: {id: productId},
            relations: ['tenant', 'medicine']
        });

        if (!pharmacyMedicine) throw new NotFoundException('Medicine not found');

        pharmacyMedicine.status = PharmacyMedicineStatus.NEEDS_REVISION;
        pharmacyMedicine.rejectionReason = reason;

        await this.pharmacyMedicineRepo.save(pharmacyMedicine);


        if (pharmacyMedicine.medicine) {
            const globalMedicine = await this.medicineRepo.findOne(
                {where: {id: pharmacyMedicine.medicine.id, tenantId: pharmacyMedicine.tenantId}});
            if (globalMedicine && globalMedicine.status !== MedicineStatus.APPROVED) {
                globalMedicine.status = MedicineStatus.NEEDS_REVISION;
                globalMedicine.rejectionReason = reason;
                await this.medicineRepo.save(globalMedicine);
            }
        }

        // ۱. ارسال نوتیفیکیشن
        await this.notifService.create({
            userId: pharmacyMedicine.tenant.ownerUserId,
            type: NotificationType.IN_APP,
            title: await this.i18n.t('medicine.notif.revision_title',
                { args: { name: String(pharmacyMedicine.medicine.name)}}),
            message: await this.i18n.t('medicine.notif.revision_message',
                { args: { reason:reason,name: String(pharmacyMedicine.medicine.name) } }),
            icon: 'ti ti-check text-green-600',
            color: 'bg-yellow-100',
            statusLabel:'warning',
            panelType: `${pharmacyMedicine.tenant.type}-ADMIN`
        });

        // ۷. افزودن job به صف
        await this.smsQueue.add('handle-send-sms', {
            phoneNumber: pharmacyMedicine.tenant.phone,
            message:await this.i18n.t('medicine.notif.revision_message',
                { args: {reason:reason, name: String(pharmacyMedicine.medicine.name) } }),
        });

        return this.mapToResponseObject(pharmacyMedicine, pharmacyMedicine.medicine);
    }

    async rejectMedicine(productId: string, reason: string): Promise<any> {
        // (Reject)
        const pharmacyMedicine = await this.pharmacyMedicineRepo.findOne({
            where: {id: productId},
            relations: ['tenant', 'medicine']
        });

        if (!pharmacyMedicine) throw new NotFoundException('Medicine not found');

        pharmacyMedicine.status = PharmacyMedicineStatus.REJECTED;
        pharmacyMedicine.rejectionReason = reason;
        await this.pharmacyMedicineRepo.save(pharmacyMedicine);


        if (pharmacyMedicine.medicine) {
            const globalMedicine = await this.medicineRepo.findOne(
                {where: {id: pharmacyMedicine.medicine.id, tenantId: pharmacyMedicine.tenantId}});
            if (globalMedicine && globalMedicine.status !== MedicineStatus.APPROVED) {
                globalMedicine.status = MedicineStatus.REJECTED;
                globalMedicine.rejectionReason = reason;
                await this.medicineRepo.save(globalMedicine);
            }
        }

        // ۱. ارسال نوتیفیکیشن
        await this.notifService.create({
            userId: pharmacyMedicine.tenant.ownerUserId,
            type: NotificationType.IN_APP,
            title: await this.i18n.t('medicine.notif.reject_title',
                { args: { name: String(pharmacyMedicine.medicine.name)}}),
            message: await this.i18n.t('medicine.notif.reject_message',
                { args: { reason:reason,name: String(pharmacyMedicine.medicine.name) } }),
            icon: 'ti ti-check text-green-600',
            color: 'bg-red-100',
            statusLabel:'error',
            panelType: `${pharmacyMedicine.tenant.type}-ADMIN`
        });

        // ۷. افزودن job به صف
        await this.smsQueue.add('handle-send-sms', {
            phoneNumber: pharmacyMedicine.tenant.phone,
            message:await this.i18n.t('medicine.notif.reject_message',
                { args: {reason:reason, name: String(pharmacyMedicine.medicine.name) } }),
        });

        return this.mapToResponseObject(pharmacyMedicine, pharmacyMedicine.medicine);
    }



}