import {
    BadRequestException,
    ConflictException,
    Injectable,
    InternalServerErrorException,
    NotFoundException
} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {DataSource, In, Repository} from 'typeorm';
import {InjectQueue} from "@nestjs/bull";
import {Queue} from "bull";
import {I18nService} from "nestjs-i18n";
import {CreateRequestTenantDto} from "../dto/create-request-tenant.dto";
import {NotificationService} from "../../notification/notification.service";
import {AuditLog, TenantRequest} from "../entities/tenant-request.entity";
import {Tenant, TenantType} from "../../../core/entities/tenant.entity";
import {User} from "../../user/entities/user.entity";
import {NotificationType} from "../../notification/notification.entity";
import {UpdateRequestTenantDto} from "../dto/update-request-tenant.dto";
import {Order} from "../../order/order.entity";
import {TenantSetting} from "../entities/tenant-setting.entity";
import {Appointment, AppointmentStatus, AppointmentType} from "../../../modules/vet&clinic/entities/appointment.entity";
import {CreateReviewDto} from "../../../modules/market/review/create-review.dto";
import {TenantReview} from "../../reviews/tenant-review.entity";
import {BankCard} from "../../../modules/market/account/bank-card.entity";
import {TimeOffBlock} from "../../../modules/vet&clinic/entities/time-off.entity";
import {AppointmentQueue, QueueStatus} from "../../../modules/vet&clinic/appointment/entities/appointment-queue.entity";
import {PaymentStatus} from "../../gateways/payments/payment-status-machine.enum";
import {OrderStatus} from "../../order/order-status.enum";
import {ProductVariant} from "../../../modules/market/product/entities/product-variant.entity";
import {MarketProduct} from "../../../modules/market/product/entities/product.entity";
import {Payment} from "../../gateways/payments/payment.entity";
import {OrderStateMachineService} from "../../../modules/pharmacy/payment/order-state-machine.service";
import {WalletTransaction, WalletTransactionType} from "../../wallet/wallet-transaction.entity";
import {WalletService} from "../../wallet/wallet.service";
import {WalletType} from "../../wallet/wallet.entity";
import {PharmacyMedicine} from "../../../modules/pharmacy/medicine/pharmacy-medicine.entity";
import {Transaction, TransactionStatus} from "../../transaction/transaction.entity";
import {TenantSpecialty} from "../../../core/entities/tenant-specialty.entity";
import {TenantService} from "../../../tenants/tenant.service";
import {ClinicService} from "../../../modules/vet&clinic/entities/clinic-service.entity";
import {request} from "express";
import {getTenantTypeLabel} from "../../../common/helper/helpers";
import {TenantCategory} from "../../../modules/market/category/tenant-category.entity";

export interface VetAvailabilityResponse {
    tenantId: string;
    isOnline: boolean;
    available: boolean;
    activeCount: number;
    maxCapacity: number;
    serviceEnabled: boolean;
    queuePosition?: number;
    estimatedWaitMinutes?: number;
    yourTurn?: boolean;
    userInQueue?: boolean;
    queueOrderId?: string;
    message?: string;
}

@Injectable()
export class UserTenantService {
    constructor(
        private readonly i18n: I18nService,
        @InjectQueue('send-sms') private smsQueue: Queue, // تزریق صف
        @InjectQueue('notifications') private notificationQueue: Queue,
        private notifService: NotificationService,
        @InjectRepository(TenantRequest) private tenantReqRepo: Repository<TenantRequest>,
        @InjectRepository(TenantSpecialty) private tenantSpecialtiesRepo: Repository<TenantSpecialty>,
        @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
        @InjectRepository(ClinicService) private tenantServiceRepo: Repository<ClinicService>,
        @InjectRepository(Appointment) private appointmentRepo: Repository<Appointment>,
        @InjectRepository(TenantSpecialty) private specialtyRepo: Repository<TenantSpecialty>,
        private readonly dataSource: DataSource,
        @InjectRepository(TenantSetting) private settingRepo: Repository<TenantSetting>,
        @InjectRepository(BankCard)
        private bankCardsRepository: Repository<BankCard>,
        @InjectRepository(TimeOffBlock)
        private timeOffRepository: Repository<TimeOffBlock>,
        @InjectRepository(Order)
        private orderRepository: Repository<Order>,
        private readonly orderStateMachine: OrderStateMachineService,
        private readonly walletService: WalletService,
    ) {
    }

    /**
     * Retrieve all tenants of type CLINIC or VET
     */
    async findAllTenant(): Promise<Tenant[]> {
        const tenants= await this.tenantRepo.createQueryBuilder('tenant')
            .leftJoinAndSelect('tenant.tenantServices', 'service', 'service.status = :status', {status: 'active'})

            // لود کردن tenantSettings برای همه
            .leftJoinAndSelect('tenant.tenantSettings', 'setting')
            .leftJoinAndSelect('tenant.tenantAddress', 'tenantAddress')
            //.leftJoinAndSelect('tenant.tenantReviews', 'reviews')

            // لود کردن marketSetting فقط اگر نوع داروخانه باشد
            .leftJoinAndSelect(
                'tenant.settings',
                'pharmacySettings',
                'tenant.type = :pharmacyType',
                {pharmacyType: TenantType.PHARMACY}
            )
            // اصلاح شده: لود کردن محصولات مارکت
            // ابتدا خود marketProducts را لود می‌کنیم
            .leftJoinAndSelect('tenant.marketProducts', 'mp')
            // سپس از روی نام مستعار 'mp'، رابطه product را لود می‌کنیم
            // توجه: نام 'product' باید دقیقاً با نام پراپرتی در Entity MarketProduct یکی باشد
            .leftJoinAndSelect('mp.product', 'product')

            // اصلاح شده: لود کردن داروها
            .leftJoinAndSelect('tenant.pharmacyMedicines', 'pm')
            .leftJoinAndSelect('pm.medicine', 'medicine')

            .where('tenant.type IN (:...types)', {types: [TenantType.CLINIC, TenantType.VET, TenantType.PHARMACY]})
            .getMany();

        // 2. استخراج تمام IDهای تخصص از تمام رکوردها
        // ما هم تخصص اصلی (تک رشته) و هم لیست تخصص‌ها (آرایه) را بررسی می‌کنیم
        const allSpecialtyIds = new Set<string>();
        const allServicesIds=new Set<string>();

        tenants.forEach(tenant => {
            // اضافه کردن تخصص اصلی اگر وجود داشته باشد
            if (tenant.specialty) {
                allSpecialtyIds.add(tenant.specialty);
            }
            // اضافه کردن تخصص‌های لیست اگر وجود داشته باشند
            if (tenant.specialties && Array.isArray(tenant.specialties)) {
                tenant.specialties.forEach(id => {
                    if (id) {
                        allSpecialtyIds.add(id);
                    }
                });
            }
            if (tenant.services && Array.isArray(tenant.services)) {
                tenant.services.forEach(id => {
                    if (id) {
                        allServicesIds.add(id);
                    }
                });
            }
        });

        // 3. اگر تخصصی وجود داشت، نام آن‌ها را از دیتابیس بگیر
        let specialtyMap: Record<string, string> = {};
        let serviceMap: Record<string, string> = {};

        if (allSpecialtyIds.size > 0) {
            // تبدیل Set به Array برای استفاده در In
            const idsArray = Array.from(allSpecialtyIds);

            const specialties = await this.specialtyRepo.find({
                where: { id: In(idsArray) },
                select: ['id', 'label'] // فرض بر این است که فیلد نام در Entity تخصص 'name' است
            } as any);

            // تبدیل لیست به یک آبجکت برای دسترسی سریع: { 'uuid': 'نام تخصص' }
            specialtyMap = specialties.reduce((acc, spec) => {
                acc[spec.id] = spec.label;
                return acc;
            }, {} as Record<string, string>);
        }

        if (allServicesIds.size > 0) {
            // تبدیل Set به Array برای استفاده در In
            const idsServiceArray = Array.from(allServicesIds);

            const services = await this.tenantServiceRepo.find({
                where: { id: In(idsServiceArray) },
                select: ['id', 'label'] // فرض بر این است که فیلد نام در Entity تخصص 'name' است
            } as any);

            // تبدیل لیست به یک آبجکت برای دسترسی سریع: { 'uuid': 'نام تخصص' }
            serviceMap = services.reduce((acc, spec) => {
                acc[spec.id] = spec.label;
                return acc;
            }, {} as Record<string, string>);
        }

        // 4. جایگزینی IDها با نام‌ها در پاسخ نهایی
        return tenants.map(tenant => {
            // کپی آبجکت برای جلوگیری از تغییر مستقیم در Entity (بهترین پراکتیس)
            const plainTenant = { ...tenant };

            // تبدیل تخصص اصلی
            if (plainTenant.specialty) {
                plainTenant.specialty = specialtyMap[plainTenant.specialty] || plainTenant.specialty;
                // اگر می‌خواهید خود فیلد specialty نام شود (نه specialtyName):
                // plainTenant.specialty = specialtyMap[plainTenant.specialty] || plainTenant.specialty;
            }

            // تبدیل آرایه تخصص‌ها
            if (plainTenant.specialties && Array.isArray(plainTenant.specialties)) {
                plainTenant.specialties = plainTenant.specialties
                    .map(id => specialtyMap[id] || id) // اگر نام پیدا شد، نام بگذار، وگرنه ID را نگه دار
                    .filter(name => name); // حذف مقادیر خالی
            }

            if (plainTenant.services && Array.isArray(plainTenant.services)) {
                plainTenant.services = plainTenant.services
                    .map(id => serviceMap[id] || id) // اگر نام پیدا شد، نام بگذار، وگرنه ID را نگه دار
                    .filter(name => name); // حذف مقادیر خالی
            }

            return plainTenant;
        });
    }

    /**
     * Get all settings for a specific tenant as a single object
     */
    async getAllSettings(shopId: string) {

        const settings = await this.settingRepo.find({
            where: {tenantId: shopId}
        });

        // Convert array of key-values to a single object
        const result: any = {};
        settings.forEach(item => {
            result[item.key] = item.value;
        });

        return result;
    }

    async getDefaultCard(tenantId: string) {

        return this.bankCardsRepository.findOne({
            where: {tenant: {id: tenantId}, isDefault: true},
        } as any);
    }

    /**
     * Retrieve all tenants (shops)
     */
    async findAll(): Promise<Tenant[]> {
        return this.tenantRepo.find({
            where: {status: 'active'},
            relations: ['tenantAddress']
            // select: ['id', 'name', 'type']
        });
    }

    /**
     * Retrieve all tenants (shops)
     */
    async findAllForAppointmentsMe(userId: string): Promise<Appointment[]> {
        return this.appointmentRepo.find({
            where: {userId: userId},
            relations: ['pet.owner', 'tenant.tenantAddress', 'doctor', 'order', 'consultation', 'review']

            // select: ['id', 'name', 'type']
        });
    }

    async findAppointmentById(userId: string): Promise<Appointment | null> {
        return this.appointmentRepo.findOne({
            where: {userId: userId},
            relations: ['pet', 'tenant', 'doctor', 'order', 'consultation']
        });
    }

    async getAllAppointmentsForTenant(tenantId: string): Promise<Appointment[]> {
        return this.appointmentRepo.find({
            where: {tenantId},
            relations: ['order.payment'],
            // نکته مهم: باید id را هم صریحاً انتخاب کنید
            select: {
                id: true,
                order: {
                    id: true,
                    status: true,
                    payment: {
                        id: true,
                        metadata: true
                    }
                }
            }
        } as any);
    }

    async getTimeOffBlocksForTenant(tenantId: string): Promise<TimeOffBlock[]> {
        // فعلاً تمام رکوردها را برمی‌گردانیم:
        return this.timeOffRepository.find({
            where: {tenantId},
            order: {date: 'ASC', startTime: 'ASC'}
        });
    }

    /**
     * Retrieve all shop requests
     */
    async findAllForMe(userId: string): Promise<any[]> {
        // 1. دریافت تمام درخواست‌های تِنت
        const tenantRequests = await this.tenantReqRepo.find({
            where: {userId: userId}
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

    async findTenantSpecialties() {
        return this.tenantSpecialtiesRepo.find();
    }

    async findTenantServices() {
        return this.tenantServiceRepo.find();
    }

    /**
     * _Create a new shop request_
     * This corresponds to the 'createShopRequest' logic in the frontend store
     */
    async addRequestForTenant(dto: CreateRequestTenantDto, user: User,deviceInfo?:any): Promise<{
        success: boolean;
        message: string;
        data?: TenantRequest
    }> {
        // ────────────── ۰. بررسی وضعیت درخواست‌های قبلی ──────────────
        // این بررسی خارج از تراکنش انجام می‌شود تا از باز کردن تراکنش‌های غیرضروری جلوگیری شود
        const existingRequest = await this.tenantReqRepo.findOne({
            where: {
                userId: user.id,
                status: In(['approved', 'pending']),
            },
            order: {createdAt: 'DESC'},
        });

        /*if (existingRequest) {
            if (existingRequest.status === 'approved') {

                // ارسال نوتیفیکیشن برای درخواست تایید شده قبلی
                await this.notifService.create({
                    userId: user.id,
                    type: NotificationType.IN_APP,
                    title: await this.i18n.t('tenant.notif.already_approved_title'),
                    message: await this.i18n.t('tenant.notif.already_approved_message'),
                    icon: 'ti ti-info-circle text-blue-600',
                    color: 'bg-blue-100',
                    panelType: `${existingRequest.type}`
                });

                throw new ConflictException(
                    await this.i18n.t('tenant.request.already_approved')
                );
            }
            if (existingRequest.status === 'pending') {

                // ارسال نوتیفیکیشن برای درخواست در حال بررسی قبلی
                await this.notifService.create({
                    userId: user.id,
                    type: NotificationType.IN_APP,
                    title: await this.i18n.t('tenant.notif.already_pending_title'),
                    message: await this.i18n.t('tenant.notif.already_pending_message'),
                    icon: 'ti ti-clock text-orange-600',
                    color: 'bg-orange-100',
                    panelType: 'VET-CLINIC-PHARMACY'//`${existingRequest.type}`
                });

                throw new ConflictException(
                    await this.i18n.t('tenant.request.already_pending', {lang: 'fa'})
                );
            }
        }*/

        // ─────────────ـ شروع فرآیند ثبت درخواست (تراکنش) ───────────────
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const auditLog: AuditLog = {
                userId: user.id,
                acceptedAt: new Date(),
                acceptedIp: deviceInfo.ip,
                commissionAccepted: true,
                contractVersion: '1.0.3',
                userAgent: deviceInfo.userAgent,
                documentsStatus: {
                    phoneVerified: true,
                    ibanVerified: true,
                    license: dto.documents?.license ? 'uploaded' : undefined,
                    degree: dto.documents?.degree ? 'uploaded' : undefined,
                    selfie: dto.documents?.selfie ? 'uploaded' : undefined,
                    logo: dto.documents?.logo ? 'uploaded' : undefined,
                    personalPhoto: dto.documents?.personalPhoto ? 'uploaded' : undefined,
                    video: dto.documents?.video ? 'uploaded' : undefined,
                }
            };
            // ۱. ایجاد موجودیت درخواست
            const newRequest = queryRunner.manager.create(TenantRequest, {
                ...dto,
                auditLog:auditLog,
                userId: user.id,
                status: 'pending',
            } as any);

            // ۲. ذخیره در دیتابیس
            // ابتدا ذخیره می‌کنیم (بدون relation)
            const savedRequest = await queryRunner.manager.save(newRequest);

            // سپس رکورد ذخیره شده را دوباره با relation لود می‌کنیم
            const requestWithUser = await queryRunner.manager.findOne(TenantRequest, {
                where: {id: savedRequest.id},
                relations: ['user'], // لود کردن رابطه کاربر
            } as any);

            // اگر کاربری پیدا نشد (نباید پیش بیاید ولی برای اطمینان)
            if (!requestWithUser?.user) {
                throw new Error('User not found for this request');
            }

            // ADD NOTIF TO SOCKET AND IN_APP
            await this.notifService.create({
                userId: user.id,
                type: NotificationType.IN_APP,
                title: await this.i18n.t('tenant.notif.create_title', {args: {type: getTenantTypeLabel(dto.type.toUpperCase())}}),
                message: await this.i18n.t('tenant.notif.create_message',{args: {type: getTenantTypeLabel(dto.type.toUpperCase())}}),
                icon: 'ti ti-check text-green-600',
                color: 'bg-green-100',
                panelType: 'VET-CLINIC-PHARMACY'//`${dto.type}`
            });

            const superAdmin = await queryRunner.manager.findOne(User, {
                where: {
                    roles: { // فرض بر این است که رابطه با نام roles تعریف شده است
                        name: 'SUPER_ADMIN'
                    }
                },
                relations: ['roles'] // حتما باید رابطه را لود کنید
            } as any);

            //SEND NOTIF FOR SUPER_ADMIN
            if (superAdmin instanceof User) {
                await this.notificationQueue.add("handle-notification", {
                    userId: superAdmin.id,
                    type: NotificationType.IN_APP,
                    title: await this.i18n.t('tenant.notif.create_title', {args: {type: getTenantTypeLabel(dto.type.toUpperCase())}}),
                    message: await this.i18n.t('tenant.notif.create_message', {args: {type: getTenantTypeLabel(dto.type.toUpperCase())}}),
                    icon: 'ti ti-check text-green-600',
                    color: 'bg-green-100',
                    panelType: 'SUPER_ADMIN'//`${dto.type}`
                });
            }


            //ADD SMS JOB TO QUEUE
            await this.smsQueue.add('handle-send-sms', {
                phoneNumber: requestWithUser.user.phoneNumber,
                message: await this.i18n.t('tenant.request.created_success',{args:{type:getTenantTypeLabel(dto.type.toUpperCase())}}),
            });

            // ۵. تایید نهایی تراکنش
            await queryRunner.commitTransaction();

            return {
                success: true,
                message: await this.i18n.t('tenant.request.created_success',{args:{type:getTenantTypeLabel(dto.type.toUpperCase())}}),
                data: savedRequest,
            };
        } catch (error) {
            // ۶. در صورت بروز خطا، تغییرات را برگردان
            await queryRunner.rollbackTransaction();
            console.error('Error creating tenant request:', error);

            // اگر خطا از نوع ConflictException بود (که در مرحله ۰ پرتاب کردیم)، همان را ارسال کن
            if (error instanceof ConflictException) {
                throw error;
            }

            throw new InternalServerErrorException(
                await this.i18n.t('tenant.request.creation_failed',{args:{type:getTenantTypeLabel(dto.type).toUpperCase()}})
            );
        } finally {
            // ۷. آزادسازی QueryRunner
            await queryRunner.release();
        }
    }

    /**
     * _Update an existing shop request_
     * Updates the request details and documents atomically.
     */
    async updateRequestForTenant(requestId: string, dto: UpdateRequestTenantDto, userId: string): Promise<{
        data: TenantRequest;
        success: boolean;
        message: string
    }> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // ۱. یافتن درخواست در داخل تراکنش
            const request = await queryRunner.manager.findOne(TenantRequest, {
                where: {id: requestId},
                relations: ['user']
            } as any);

            if (!request) {
                throw new NotFoundException(await this.i18n.t('tenant.request.not_found'));
            }

            // ۲. بررسی دسترسی
            if (request.userId !== userId) {
                throw new BadRequestException(await this.i18n.t('tenant.request.no_permission'));
            }

            // ۳. بررسی وضعیت
            if (request.status === 'approved') {
                throw new BadRequestException(await this.i18n.t('tenant.request.can_not_edit_approved'));
            }

            // ۴. ادغام هوشمند مدارک (Documents)
            if (dto.documents) {
                if (!request.documents) {
                    request.documents = {} as any;
                }
                if (dto.documents.logo) {
                    request.documents.logo = dto.documents.logo;
                }
                if (dto.documents.license) {
                    request.documents.license = dto.documents.license;
                }
                if (dto.documents.nationalId) {
                    request.documents.nationalId = dto.documents.nationalId;
                }
            }

            // ۵. آپدیت فیلدهای دیگر
            const {documents, ...otherData} = dto;
            Object.assign(request, otherData);

            // ۶. ریست کردن وضعیت به pending
            request.status = 'pending';

            // ۷. ذخیره تغییرات
            const savedRequest = await queryRunner.manager.save(request);

            // ۸. ارسال نوتیفیکیشن
            await this.notifService.create({
                userId: request.userId,
                type: NotificationType.IN_APP,
                title: await this.i18n.t('tenant.notif.update_title',{args: {type: getTenantTypeLabel(request.type.toUpperCase())}}),
                message: await this.i18n.t('tenant.notif.update_message',{args: {type: getTenantTypeLabel(request.type.toUpperCase())}}),
                icon: 'ti ti-device-floppy text-blue-600', // آیکون ذخیره آبی
                color: 'bg-blue-100',
                panelType: 'VET-CLINIC-PHARMACY'//`${request.type}`
            });

            const superAdmin = await queryRunner.manager.findOne(User, {
                where: {
                    roles: { // فرض بر این است که رابطه با نام roles تعریف شده است
                        name: 'SUPER_ADMIN'
                    }
                },
                relations: ['roles'] // حتما باید رابطه را لود کنید
            } as any);

            //SEND NOTIF FOR SUPER_ADMIN
            if (superAdmin instanceof User) {
                await this.notificationQueue.add("handle-notification", {
                    userId: superAdmin.id,
                    type: NotificationType.IN_APP,
                    title: await this.i18n.t('tenant.notif.update_title', {args: {type: getTenantTypeLabel(request.type.toUpperCase())}}),
                    message: await this.i18n.t('tenant.notif.update_message', {args: {type: getTenantTypeLabel(request.type.toUpperCase())}}),
                    icon: 'ti ti-check text-green-600',
                    color: 'bg-green-100',
                    panelType: 'SUPER_ADMIN'//`${request.type}`
                });
            }

            // ۷. افزودن job به صف
            await this.smsQueue.add('handle-send-sms', {
                phoneNumber: savedRequest.user.phoneNumber,
                message: await this.i18n.t('tenant.notif.update_message',{args: {type: getTenantTypeLabel(request.type.toUpperCase())}}),
            });

            // ۱۰. تایید نهایی تراکنش
            await queryRunner.commitTransaction();

            return {
                success: true,
                message: await this.i18n.t('tenant.request.update_success',{args: {type: getTenantTypeLabel(request.type.toUpperCase())}}),
                data: savedRequest,
            };

        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Create review for a purchased tenant
     */
    async createReview(
        tenantId: string,
        userId: string,
        dto: CreateReviewDto,
    ) {
        return this.dataSource.transaction(async (manager) => {
            // 1️⃣ بررسی وجود خرید کاربر از این فروشگاه (Order)
            // اگر orderId ارسال شده، بررسی می‌کنیم که آیا سفارش متعلق به این کاربر و فروشگاه است
            let hasPurchased = false;

            if (dto.orderId) {
                hasPurchased = await manager.exists(Order, {
                    where: {
                        id: dto.orderId,
                        userId: userId,
                        tenantId: tenantId,
                        // می‌توانید وضعیت سفارش را هم چک کنید (مثلاً تکمیل شده)
                        // status: 'COMPLETED',
                    }
                });
            } else if (dto.visitId) {
                // اگر orderId نبود اما visitId بود، بررسی می‌کنیم که آیا ویزیت متعلق به این کاربر و فروشگاه است
                // فرض بر این است که موجودیت Appointment (یا Visit) فیلدهای userId و tenantId را دارد
                hasPurchased = await manager.exists(Appointment, {
                    where: {
                        id: dto.visitId,
                        userId: userId,
                        tenantId: tenantId,
                        // status: 'completed', // پیشنهاد می‌شود فقط ویزیت‌های انجام شده قابل نظردهی باشند
                    }
                });
            }

            if (!hasPurchased) {
                throw new BadRequestException('شما امکان ثبت نظر برای این مورد را ندارید (سفارش یا ویزیت یافت نشد).');
            }

            // 2️⃣ بررسی اینکه کاربر قبلاً نظر ثبت نکرده باشد
            // شرط: اگر orderId دارد، نباید برای همان orderId نظر قبلاً ثبت کرده باشد.
            // شرط: اگر visitId دارد، نباید برای همان visitId نظر قبلاً ثبت کرده باشد.
            const existingReview = await manager.exists(TenantReview, {
                where: {
                    userId: userId,
                    tenantId: tenantId,
                    // بررسی تکراری بودن بر اساس orderId یا visitId
                    ...(dto.orderId && {orderId: dto.orderId}),
                    ...(dto.visitId && {appointmentId: dto.visitId}),
                }
            });

            if (existingReview) {
                throw new BadRequestException('شما قبلاً برای این سفارش/ویزیت نظر ثبت کرده‌اید.');
            }

            // 3️⃣ ایجاد نظر
            const review = manager.create(TenantReview, {
                tenantId,
                userId,
                appointmentId: dto.visitId, // می‌تواند null باشد
                orderId: dto.orderId, // می‌تواند null باشد
                rating: dto.rating,
                comment: dto.comment,
                pros: dto.pros,
                cons: dto.cons,
                isApproved: false,
            });

            return manager.save(review);
        });
    }

    async getTenantAllReviews(tenantId: string) {
        // لیست انواع تنت‌هایی که می‌خواهیم نظراتشان را ببینیم
        // (فرض بر این است که فروشگاه‌ها type شان 'VENDOR' یا 'SHOP' است)
        const allowedTenantTypes = ['VET', 'CLINIC', 'PHARMACY'];

        const where: any = {
            isApproved: true, // فقط تایید شده‌ها
        };

        // فیلتر کردن بر اساس نوع تنت (Relation)
        // این خط باعث می‌شود فقط نظرات مربوط به تنت‌های بالا لود شوند
        where.tenant = {
            type: In(allowedTenantTypes),
        };
        where.tenantId = tenantId

        // فیلتر بر اساس امتیاز (اختیاری)
        /*if (minRating) {
            where.rating = MoreThanOrEqual(minRating);
        }*/

        return this.dataSource.getRepository(TenantReview).find({
            where: where,
            relations: ['user', 'tenant'],
            order: {
                createdAt: 'DESC',
            },
        });
    }

    /**
     * Get reviews of a tenant
     */
    async getAllTenantReviews(userId: string) {
        // لیست انواع تنت‌هایی که می‌خواهیم نظراتشان را ببینیم
        // (فرض بر این است که فروشگاه‌ها type شان 'VENDOR' یا 'SHOP' است)
        const allowedTenantTypes = ['VET', 'CLINIC', 'PHARMACY'];

        const where: any = {
            isApproved: true, // فقط تایید شده‌ها
        };

        // فیلتر کردن بر اساس نوع تنت (Relation)
        // این خط باعث می‌شود فقط نظرات مربوط به تنت‌های بالا لود شوند
        where.tenant = {
            type: In(allowedTenantTypes),
        };
        where.userId = userId

        // فیلتر بر اساس امتیاز (اختیاری)
        /*if (minRating) {
            where.rating = MoreThanOrEqual(minRating);
        }*/

        return this.dataSource.getRepository(TenantReview).find({
            where: where,
            relations: ['user', 'tenant'],
            order: {
                createdAt: 'DESC',
            },
        });
    }

    /**
     * Update an existing review
     */
    async updateTenantReview(reviewId: string, userId: string, dto: CreateReviewDto) {
        // استفاده از QueryRunner برای مدیریت تراکنش
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // ۱. پیدا کردن نظر
            const review = await queryRunner.manager.findOne(TenantReview, {
                where: {id: reviewId},
            } as any);

            if (!review) {
                throw new NotFoundException('نظر مورد نظر یافت نشد.');
            }

            // ۲. بررسی مالکیت نظر
            if (review.userId !== userId) {
                throw new BadRequestException('شما اجازه ویرایش این نظر را ندارید.');
            }

            // ۳. آپدیت فیلدها
            review.rating = dto.rating;
            review.comment = dto.comment;
            review.pros = dto.pros;
            review.cons = dto.cons;
            // اگر نیاز به تغییر وضعیت تایید هست (مثلاً بعد از ویرایش دوباره نیاز به تایید ادمین)
            // review.isApproved = false;

            // ۴. ذخیره تغییرات
            const updatedReview = await queryRunner.manager.save(review);

            // ۵. تایید تراکنش
            await queryRunner.commitTransaction();

            return updatedReview;
        } catch (error) {
            // ۶. برگشت تراکنش در صورت خطا
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            // ۷. آزادسازی منابع
            await queryRunner.release();
        }
    }

    /**
     * Delete an existing review
     */
    async deleteTenantReview(reviewId: string, userId: string) {
        // استفاده از QueryRunner برای مدیریت تراکنش
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // ۱. پیدا کردن نظر
            const review = await queryRunner.manager.findOne(TenantReview, {
                where: {id: reviewId},
            } as any);

            if (!review) {
                throw new NotFoundException('نظر مورد نظر یافت نشد.');
            }

            // ۲. بررسی مالکیت نظر
            if (review.userId !== userId) {
                throw new BadRequestException('شما اجازه حذف این نظر را ندارید.');
            }

            // ۳. حذف نظر
            await queryRunner.manager.remove(review);

            // ۴. تایید تراکنش
            await queryRunner.commitTransaction();

            return {message: 'نظر با موفقیت حذف شد.'};
        } catch (error) {
            // ۵. برگشت تراکنش در صورت خطا
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            // ۶. آزادسازی منابع
            await queryRunner.release();
        }
    }

    /**
     * بررسی وضعیت در دسترس بودن دامپزشک
     */
    async getVetAvailability(
        tenantId: string,
        serviceType?: string,
        userId?: string,
    ): Promise<VetAvailabilityResponse> {
        // ────────────── ۱. بررسی وجود دامپزشک ──────────────
        const tenant = await this.tenantRepo.findOne({
            where: {id: tenantId},
            select: [
                'id',
                'name',
                'isOnline',
                'doNotDisturb',
                'isSuspended',
                'status',
                'chatCapacity',
                'phoneInstantCapacity',
                'phoneScheduledCapacity',
                'chatEnabled',
                'phoneInstantEnabled',
                'phoneScheduledEnabled',
                'maxQueueLength',
                'capacitySettings',
            ],
        });

        if (!tenant) {
            throw new NotFoundException(await  this.i18n.t('tenant.not_found'));
        }

        // ────────────── ۲. بررسی وضعیت تعلیق ──────────────
        if (tenant.isSuspended || tenant.status !== 'active') {
            return {
                tenantId,
                isOnline: false,
                available: false,
                activeCount: 0,
                maxCapacity: 0,
                serviceEnabled: false,
                message: await this.i18n.t('tenant.vet.not_suspended'),
            };
        }

        // ────────────── ۳. بررسی آنلاین بودن ──────────────
        const isOnline = tenant.isOnline;
        const dND=tenant.doNotDisturb;

        if (!isOnline||dND) {
            return {
                tenantId,
                isOnline: false,
                available: false,
                activeCount: 0,
                maxCapacity: 3,
                serviceEnabled: false,
                message: await this.i18n.t('tenant.vet.offline'),
            };
        }

        // ────────────── ۴. تعیین ظرفیت بر اساس نوع سرویس ──────────────
        let maxCapacity = 3;
        let serviceEnabled = true;

        if (serviceType) {
            const serviceKey = this.getServiceKey(serviceType);
            switch (serviceKey) {
                case AppointmentType.ONLINE_CHAT:
                    maxCapacity = tenant.chatCapacity || 3;
                    serviceEnabled = tenant.chatEnabled;
                    break;
                case AppointmentType.PHONE_INSTANT:
                    maxCapacity = tenant.phoneInstantCapacity || 2;
                    serviceEnabled = tenant.phoneInstantEnabled;
                    break;
                case AppointmentType.PHONE_SCHEDULED:
                    maxCapacity = tenant.phoneScheduledCapacity || 2;
                    serviceEnabled = tenant.phoneScheduledEnabled;
                    break;
                default:
                    maxCapacity = tenant.chatCapacity || 3;
            }
        }

        // ────────────── ۵. بررسی ظرفیت از capacitySettings ──────────────
        if (tenant.capacitySettings && serviceType) {
            const serviceKey = this.getServiceKeyForCapacitySettings(serviceType);
            const customSettings = tenant.capacitySettings[serviceKey];

            if (customSettings) {
                maxCapacity = customSettings.maxConcurrent || maxCapacity;
                serviceEnabled = customSettings.enabled !== false;
            }
        }

        if (!serviceEnabled) {
            return {
                tenantId,
                isOnline: true,
                available: false,
                activeCount: 0,
                maxCapacity,
                serviceEnabled: false,
                message: 'این سرویس در حال حاضر فعال نیست.',
            };
        }

        // ────────────── ۶. شمارش مشاوره‌های فعال ──────────────
        const activeStatuses = [AppointmentStatus.CONFIRMED,
            AppointmentStatus.IN_PROGRESS, AppointmentStatus.WAITING, AppointmentStatus.PENDING,AppointmentStatus.IN_CHAT];

        const activeCount = await this.appointmentRepo.count({
            where: {
                tenantId,
                status: In(activeStatuses),
                ...(serviceType && {type: this.getServiceKey(serviceType) as AppointmentType}),
            },
        });
        const available = activeCount < maxCapacity;

        // ────────────── ۷. بررسی وضعیت صف کاربر ──────────────
        // ✅ تعریف در outer scope - قبل از if
        let queueInfo: {
            position?: number;
            estimatedWait?: number;
            yourTurn?: boolean;
            orderId?: string;
        } = {};
        let userQueueEntry: AppointmentQueue | null = null;  // ← این خط اضافه شد

        if (userId) {
            // ✅ استفاده از متغیر outer scope
            userQueueEntry = await this.dataSource
                .getRepository(AppointmentQueue)
                .createQueryBuilder('queue')
                .where('queue.tenantId = :tenantId', {tenantId})
                .andWhere('queue.userId = :userId', {userId})
                .andWhere('queue.status IN (:...statuses)', {
                    statuses: [QueueStatus.WAITING, QueueStatus.IN_PROGRESS],
                })
                .orderBy('queue.position', 'ASC')
                .getOne();

            if (userQueueEntry) {
                queueInfo = {
                    position: userQueueEntry.position,
                    estimatedWait: userQueueEntry.estimatedWaitMinutes,
                    yourTurn: userQueueEntry.status === QueueStatus.IN_PROGRESS,
                    orderId: userQueueEntry.id,
                };
            }
        }

        // ────────────── ۸. محاسبه زمان تقریبی انتظار ──────────────
        let estimatedWaitMinutes: number | undefined;

        if (!available) {
            const waitingCount = await this.dataSource
                .getRepository(AppointmentQueue)
                .createQueryBuilder('queue')
                .where('queue.tenantId = :tenantId', {tenantId})
                .andWhere('queue.status = :status', {status: QueueStatus.WAITING})
                .getCount();

            estimatedWaitMinutes = waitingCount * 10;
        }

        // ────────────── ۹. ساخت پاسخ نهایی ──────────────
        return {
            tenantId,
            isOnline: true,
            available: available && serviceEnabled,
            activeCount,
            maxCapacity,
            serviceEnabled,
            queuePosition: queueInfo.position,
            estimatedWaitMinutes,
            yourTurn: queueInfo.yourTurn,
            userInQueue: !!userQueueEntry,
            queueOrderId: queueInfo.orderId,
            message: this.getAvailabilityMessage(
                available,
                serviceEnabled,
                queueInfo.yourTurn,
            ),
        };
    }

    /**
     * تبدیل AppointmentType به کلید capacitySettings
     */
    private getServiceKey(serviceType: string): AppointmentType {
        // نگاشت مستقیم رشته‌ها
        switch (serviceType) {
            case 'text':
                return AppointmentType.ONLINE_CHAT;
            case 'phone-instant':
                return AppointmentType.PHONE_INSTANT;
            case 'phone-scheduled':
                return AppointmentType.PHONE_SCHEDULED;
            default:
                return AppointmentType.ONLINE_CHAT;
        }
    }

    private getServiceKeyForCapacitySettings(serviceType: string) {
        // نگاشت مستقیم رشته‌ها
        switch (serviceType) {
            case 'text':
                return 'chat';
            case 'phone-instant':
                return 'phoneInstant';
            case 'phone-scheduled':
                return 'phoneScheduled';
            default:
                return 'chat';
        }
    }

    /**
     * ساخت پیام مناسب بر اساس وضعیت
     */
    private getAvailabilityMessage(
        available: boolean,
        serviceEnabled: boolean,
        yourTurn?: boolean,
    ): string {
        if (yourTurn) {
            return '🎉 نوبت شما رسیده است!';
        }
        if (!serviceEnabled) {
            return 'این سرویس در حال حاضر فعال نیست.';
        }
        if (available) {
            return 'دکتر آماده پاسخگویی است';
        }
        return 'دکتر در حال مشاوره است. می‌توانید در صف انتظار بمانید.';
    }

    // ═══════════════════════════════════════════════════════
// 🆕 متدهای مدیریت صف
// ═══════════════════════════════════════════════════════

    /**
     * _ورود به صف انتظار (با پرداخت معتبر)_
     */
    async joinQueue(
        tenantId: string,
        userId: string,
        appointmentType: AppointmentType,
        orderId: string, // ← اجباری شد
    ): Promise<{
        success: boolean;
        orderId?: string;
        queueNumber?: number;
        position?: number;
        estimatedWaitMinutes?: number;
        message?: string;
    }> {
        // ─── ⚠️ اعتبارسنجی پرداخت ───
        if (!orderId) {
            throw new BadRequestException(
                'برای ورود به صف باید ابتدا هزینه را پرداخت کنید.'
            );
        }

        // ─── بررسی وجود سفارش ───
        const order = await this.dataSource.getRepository(Order).findOne({
            where: {id: orderId},
            relations: ['payment'],
        });

        if (!order) {
            throw new NotFoundException('سفارش یافت نشد.');
        }

        // ─── بررسی مالکیت ───
        if (order.userId !== userId) {
            throw new BadRequestException('این سفارش متعلق به شما نیست.');
        }
        if (order.tenantId !== tenantId) {
            throw new BadRequestException('این سفارش برای این دامپزشک نیست.');
        }

        // ─── بررسی وضعیت پرداخت (PAID) ───
        if (order.payment?.status !== PaymentStatus.PAID) {
            throw new BadRequestException(
                'سفارش هنوز پرداخت نشده است. لطفاً ابتدا پرداخت را انجام دهید.'
            );
        }

        // ─── بررسی استفاده نشدن قبلی ───
        const existingQueueEntry = await this.dataSource
            .getRepository(AppointmentQueue)
            .findOne({where: {orderId}});

        if (existingQueueEntry) {
            throw new ConflictException('این سفارش قبلاً استفاده شده است.');
        }

        // ─── بررسی کاربر در صف نیست ───
        const existingQueue = await this.dataSource
            .getRepository(AppointmentQueue)
            .createQueryBuilder('queue')
            .where('queue.tenantId = :tenantId', {tenantId})
            .andWhere('queue.userId = :userId', {userId})
            .andWhere('queue.status IN (:...statuses)', {
                statuses: [QueueStatus.WAITING, QueueStatus.IN_PROGRESS],
            })
            .getOne();

        if (existingQueue) {
            if (existingQueue.status === QueueStatus.IN_PROGRESS) {
                return {
                    success: true,
                    orderId: existingQueue.id,
                    queueNumber: existingQueue.position,
                    position: 0,
                    estimatedWaitMinutes: 0,
                    message: 'شما در حال حاضر در حال مشاوره هستید.',
                };
            }
            return {
                success: false,
                orderId: existingQueue.id,
                position: existingQueue.position,
                message: 'شما قبلاً در صف هستید.',
            };
        }

        // ─── بررسی ظرفیت ───
        const availability = await this.getVetAvailability(tenantId, appointmentType, userId);

        if (!availability.serviceEnabled) {
            throw new BadRequestException(availability.message);
        }

        // ─── اگر ظرفیت خالی هست ───
        if (availability.available) {
            return {
                success: true,
                orderId: undefined,
                queueNumber: 0,
                position: 0,
                estimatedWaitMinutes: 0,
                message: 'دکتر آماده است. مشاوره شروع می‌شود.',
            };
        }

        // ─── افزودن به صف ───
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // شمارش افراد در صف
            const waitingCount = await queryRunner.manager
                .getRepository(AppointmentQueue)
                .count({
                    where: {tenantId, appointmentType, status: QueueStatus.WAITING},
                });

            const nextPosition = waitingCount + 1;
            const estimatedWait = nextPosition * 10;

            // ─── ساخت رکورد صف با orderId واقعی ───
            const queueEntry = queryRunner.manager.create(AppointmentQueue, {
                tenantId,
                userId,
                orderId,              // ← order واقعی پرداخت‌شده
                appointmentType,
                queueNumber: nextPosition,
                position: nextPosition,
                status: QueueStatus.WAITING,
                estimatedWaitMinutes: estimatedWait,
            });

            const saved = await queryRunner.manager.save(queueEntry);

            // ─── آپدیت وضعیت سفارش به IN_QUEUE ───
            await queryRunner.manager.update(Order, orderId, {
                status: OrderStatus.IN_QUEUE,
            });

            await queryRunner.commitTransaction();

            return {
                success: true,
                orderId: saved.id,
                queueNumber: saved.position,
                position: saved.position,
                estimatedWaitMinutes: saved.estimatedWaitMinutes,
                message: `شما در جایگاه ${nextPosition} صف هستید.`,
            };
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * _دریافت وضعیت صف خود کاربر_
     */
    async getUserQueueStatus(
        userId: string,
        tenantId?: string,
    ): Promise<{
        inQueue: boolean;
        yourTurn: boolean;
        orderId?: string;
        position?: number;
        estimatedWaitMinutes?: number;
        serviceType?: string;
        status?: QueueStatus;
    }> {
        const whereClause: any = {
            userId,
            status: In([QueueStatus.WAITING, QueueStatus.IN_PROGRESS]),
        };
        if (tenantId) {
            whereClause.tenantId = tenantId;
        }

        const entry = await this.dataSource
            .getRepository(AppointmentQueue)
            .createQueryBuilder('queue')
            //.leftJoinAndSelect('queue.tenant', 'tenant')
            .where('queue.userId = :userId', {userId})
            .andWhere(tenantId ? 'queue.tenantId = :tenantId' : '1=1', {tenantId})
            .andWhere('queue.status IN (:...statuses)', {
                statuses: [QueueStatus.WAITING, QueueStatus.IN_PROGRESS],
            })
            //.orderBy('queue.joinedAt', 'DESC')
            .getOne();

        if (!entry) {
            return {inQueue: false, yourTurn: false};
        }

        // اگر نوبت کاربر هست، وضعیت را آپدیت کن
        if (entry.status === QueueStatus.IN_PROGRESS && !entry.startedAt) {
            entry.startedAt = new Date();
            await this.dataSource.getRepository(AppointmentQueue).save(entry);
        }

        return {
            inQueue: true,
            yourTurn: entry.status === QueueStatus.IN_PROGRESS,
            orderId: entry.id,
            position: entry.position,
            estimatedWaitMinutes: entry.estimatedWaitMinutes,
            serviceType: entry.appointmentType,
            status: entry.status,
        };
    }

    /**
     * _دریافت لیست صف انتظار_
     */
    async getQueueList(
        tenantId: string,
        serviceType?: string,
        currentUserId?: string,
    ): Promise<{
        items: Array<{
            orderId: string;
            position: number;
            queueNumber: number;
            status: QueueStatus;
            joinedAt: string;
            estimatedWaitMinutes: number;
            isCurrentUser: boolean;
        }>;
        totalCount: number;
        yourPosition?: number;
    }> {
        const queryBuilder = this.dataSource
            .getRepository(AppointmentQueue)
            .createQueryBuilder('queue')
            .select([
                'queue.id',
                'queue.orderId',
                'queue.position',
                'queue.queueNumber',
                'queue.status',
                'queue.joinedAt',
                'queue.estimatedWaitMinutes',
            ])
            .where('queue.tenantId = :tenantId', {tenantId})
            .andWhere('queue.status = :status', {status: QueueStatus.WAITING})
            .orderBy('queue.position', 'ASC');

        if (serviceType) {
            queryBuilder.andWhere('queue.serviceType = :serviceType', {serviceType});
        }

        const items = await queryBuilder.getMany();

        const formattedItems = items.map((item) => ({
            orderId: item.id,
            position: item.position,
            queueNumber: item.position,
            status: item.status,
            joinedAt: item.assignedAt.toISOString(),
            estimatedWaitMinutes: item.estimatedWaitMinutes,
            isCurrentUser: item.userId === currentUserId,
        }));

        // پیدا کردن موقعیت کاربر فعلی
        const userEntry = items.find((item) => item.userId === currentUserId);

        return {
            items: formattedItems,
            totalCount: items.length,
            yourPosition: userEntry?.position,
        };
    }

    /**
     * _خروج از صف_
     */
    async leaveQueue(orderId: string, userId: string): Promise<{ success: boolean; message: string }> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const entry = await queryRunner.manager.findOne(AppointmentQueue, {
                where: {id: orderId},
            } as any);

            if (!entry) {
                throw new NotFoundException('رکورد صف یافت نشد.');
            }

            if (entry.userId !== userId) {
                throw new BadRequestException('شما اجازه خروج از این صف را ندارید.');
            }

            if (entry.status === QueueStatus.IN_PROGRESS) {
                throw new BadRequestException('مشاوره شما شروع شده است. امکان خروج وجود ندارد.');
            }

            entry.status = QueueStatus.CANCELLED;
            await queryRunner.manager.save(entry);

            // ─── به‌روزرسانی position بقیه افراد صف ───
            await queryRunner.manager
                .createQueryBuilder()
                .update(AppointmentQueue)
                .set({position: () => 'position - 1'})
                .where('tenantId = :tenantId', {tenantId: entry.tenantId})
                .andWhere('appointmentType = :appointmentType', {appointmentType: entry.appointmentType})
                .andWhere('status = :status', {status: QueueStatus.WAITING})
                .andWhere('position > :currentPos', {currentPos: entry.position})
                .execute();

            await queryRunner.commitTransaction();

            return {success: true, message: 'با موفقیت از صف خارج شدید.'};
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * لغو سفارش توسط کاربر و بازگشت وجه به کیف پول کاربر
     * منبع بازگشت: بستگی به وضعیت تسویه دارد (Platform Bank یا Shop/Petoman)
     * مقصد بازگشت: کیف پول کاربر (User Wallet)
     */
    async cancelOrderByUser(orderId: string, userId: string): Promise<any> {
        return this.orderRepository.manager.transaction(async (manager) => {

            // 1️⃣ پیدا کردن سفارش و اطمینان از مالکیت
            const order = await manager.findOne(Order, {
                where: {id: orderId, userId},
                relations: ['items', 'items.marketProduct', 'items.variant', 'items.pharmacyMedicine','transaction']
            } as any);

            if (!order) {
                throw new NotFoundException('Order not found or unauthorized.');
            }

            // جلوگیری از لغو سفارشات تحویل داده شده
            // مثال در سرویس OrderService
            if (([OrderStatus.TENANT_PROCESSING, OrderStatus.TENANT_SHIPPED, OrderStatus.CUSTOMER_DELIVERED, OrderStatus.CUSTOMER_REFUNDED] as OrderStatus[]).includes(order.status)) {
                throw new BadRequestException('سفارش در وضعیت کنونی قابل لغو نیست. لطفاً از فرآیند مرجوعی استفاده کنید.');
            }

            // =========================================================
            // ✅ تغییر جدید: بازگرداندن موجودی محصولات و ورینت‌ها
            // =========================================================
            if (order.items && order.items.length > 0) {
                for (const item of order.items) {
                    // اگر آیتم ورینت دارد، موجودی ورینت را برگردان
                    if (item.variant) {
                        // لود کردن ورینت اگر در رابطه بالا لود نشده باشد (برای اطمینان)
                        const variant = await manager.findOne(ProductVariant, {
                            where: {id: item.variant.id}
                        } as any);

                        if (variant) {
                            variant.stock += item.quantity;
                            await manager.save(variant);
                        }
                    }
                    // اگر ورینت ندارد، موجودی محصول اصلی را برگردان
                    else if (item.marketProduct) {
                        // لود کردن محصول اگر در رابطه بالا لود نشده باشد
                        const product = await manager.findOne(MarketProduct, {
                            where: {id: item.productId}
                        } as any);

                        if (product) {
                            product.stock += item.quantity;
                            await manager.save(product);
                        }
                    }
                    // اگر دارو دارد، موجودی داروی اصلی را برگردان
                    else if (item.pharmacyMedicine) {
                        // لود کردن دارو اگر در رابطه بالا لود نشده باشد
                        const medicine = await manager.findOne(PharmacyMedicine, {
                            where: {id: item.medicineId}
                        } as any);

                        if (medicine) {
                            medicine.stock += item.quantity;
                            await manager.save(medicine);
                        }
                    }
                }
            }
            // =========================================================
            // پایان بخش بازگرداندن موجودی
            // =========================================================


            // 2️⃣ پیدا کردن رکورد پرداخت
            const payment = await manager.findOne(Payment, {
                where: {orderId: order.id},
            } as any);

            if (!payment) {
                throw new NotFoundException('Payment record not found.');
            }

            if (payment.status === PaymentStatus.REFUNDED || payment.status === PaymentStatus.CANCELED) {
                throw new BadRequestException('This payment has already been refunded.');
            }

            // 3️⃣ تغییر وضعیت سفارش به لغو شده (FSM)
            try {
                await this.orderStateMachine.transitionOrder(
                    orderId,
                    OrderStatus.CUSTOMER_CANCELLED,
                    manager,
                    'VET-CLINIC-PHARMACY',
                    userId
                );
            } catch (error) {
                throw new BadRequestException(`Failed to update order status: ${error.message}`);
            }

            // 4️⃣ تشخیص وضعیت تسویه و مدیریت تراکنش‌های Pending
            const pendingCreditTx = await manager.findOne(WalletTransaction, {
                where: {referenceId: payment.id, type: WalletTransactionType.PENDING_CREDIT}
            } as any);

            const pendingFeeTx = await manager.findOne(WalletTransaction, {
                where: {referenceId: payment.id, type: WalletTransactionType.PENDING_FEE}
            } as any);

            if (pendingCreditTx) {
                pendingCreditTx.metadata = {
                    ...pendingCreditTx.metadata,
                    cancelled: true,
                    cancelledAt: new Date()
                };
                await manager.save(WalletTransaction, pendingCreditTx);
            }
            if (pendingFeeTx) {
                pendingFeeTx.metadata = {
                    ...pendingFeeTx.metadata,
                    cancelled: true,
                    cancelledAt: new Date()
                };
                await manager.save(WalletTransaction, pendingFeeTx);
            }

            const refundAmount = Number(payment.amount);
            const userWallet = await this.walletService.getWallet(
                undefined,
                userId,
                WalletType.USER,
                manager
            );

            const isSettled = !pendingCreditTx && !pendingFeeTx;

            if (isSettled) {
                // ---------------------------------------------------------
                // حالت ۲: تسویه انجام شده است (تراکنش‌های Pending وجود ندارند)
                // پول بین فروشنده و پلتفرم تقسیم شده است.
                // باید از کیف پول فروشنده و پلتفرم برداشت کنیم.
                // ---------------------------------------------------------

                // 1. برداشت از کیف پول فروشنده (Shop Wallet)
                const shopWallet = await this.walletService.getWallet(
                    order.tenantId,
                    undefined,
                    WalletType.SHOP,
                    manager
                );
                if (!shopWallet) {
                    throw new InternalServerErrorException('Shop wallet not found.');
                }

                const platformFeePercent = 5;
                const platformRefundAmount = (refundAmount * platformFeePercent) / 100;
                const shopRefundAmount = refundAmount - platformRefundAmount; // فرض: کل مبلغ به کاربر برگشت داده می‌شود

                if (Number(shopWallet.balance) < shopRefundAmount) {
                    throw new BadRequestException(`Insufficient balance in shop wallet for refund. Shop needs to cover ${shopRefundAmount}.`);
                }

                await this.walletService.executeTransaction(
                    manager,
                    shopWallet,
                    WalletTransactionType.REFUND_OUT,
                    shopRefundAmount,
                    `Refund for canceled order #${order.id} - Shop Share`,
                    order.id
                );

                // 2. برداشت از کیف پول پلتفرم (Petoman Wallet)
                const petomanWallet = await this.walletService.getWallet(
                    undefined,
                    undefined,
                    WalletType.PETOMAN,
                    manager
                );
                if (!petomanWallet) {
                    throw new InternalServerErrorException('Petoman wallet not found.');
                }

                if (Number(petomanWallet.balance) < platformRefundAmount) {
                    throw new BadRequestException(`Insufficient balance in Petoman wallet for refund.`);
                }


                await this.walletService.executeTransaction(
                    manager,
                    petomanWallet,
                    WalletTransactionType.REFUND_OUT,
                    platformRefundAmount,
                    `Refund for canceled order #${order.id} - Platform Fee`,
                    order.id
                );

                // 3. واریز به کیف پول کاربر (کل مبلغ)
                await this.walletService.executeTransaction(
                    manager,
                    userWallet,
                    WalletTransactionType.REFUND_IN,
                    refundAmount,
                    `Refund for canceled order #${order.id}`,
                    order.id
                );


            } else {
                // ---------------------------------------------------------
                // حالت ۱: تسویه انجام نشده است (تراکنش‌های Pending وجود دارند)
                // پول هنوز در صندوق پلتفرم است.
                // باید تراکنش‌های Pending را لغو کنیم تا جاب شبانه آن‌ها را پردازش نکند.
                // ---------------------------------------------------------

                // پیدا کردن کیف پول صندوق پلتفرم
                const platformBankWallet = await this.walletService.getWallet(
                    undefined,
                    undefined,
                    WalletType.PLATFORM_BANK,
                    manager
                );
                if (!platformBankWallet) {
                    throw new InternalServerErrorException('Platform bank wallet not found.');
                }

                // اعتبارسنجی موجودی صندوق
                if (Number(platformBankWallet.balance) < refundAmount) {
                    throw new InternalServerErrorException('Insufficient funds in platform bank for refund.');
                }

                // لغو تراکنش پندینگ Credit (سهم فروشنده)
                if (pendingCreditTx) {
                    // ایجاد تراکنش معکوس برای خنثی کردن پندینگ
                    // فرض: نوع CANCEL_CREDIT باعث می‌شود جاب شبانه این تراکنش را نادیده بگیرد
                    const cancelCreditTx = manager.create(WalletTransaction, {
                        walletId: (pendingCreditTx as WalletTransaction).walletId, // کیف پول فروشنده
                        type: WalletTransactionType.CANCEL_CREDIT, // تایپ جدید برای لغو
                        amount: (pendingCreditTx as WalletTransaction).amount,
                        balanceAfter: Number((pendingCreditTx as WalletTransaction).balanceAfter), // موجودی تغییر نمی‌کند چون هنوز واریز نشده
                        description: `Cancel pending credit for order #${order.id}`,
                        referenceId: order.id,
                        metadata: {...(pendingCreditTx as WalletTransaction).metadata, cancelledByRefund: true}
                    });
                    await manager.save(WalletTransaction, cancelCreditTx);
                }

                // لغو تراکنش پندینگ Fee (سهم پلتفرم)
                if (pendingFeeTx) {
                    const cancelFeeTx = manager.create(WalletTransaction, {
                        walletId: (pendingFeeTx as WalletTransaction).walletId, // کیف پول پلتفرم
                        type: WalletTransactionType.CANCEL_FEE, // تایپ جدید برای لغو
                        amount: (pendingFeeTx as WalletTransaction).amount,
                        balanceAfter: Number((pendingFeeTx as WalletTransaction).balanceAfter),
                        description: `Cancel pending fee for order #${order.id}`,
                        referenceId: order.id,
                        metadata: {...(pendingFeeTx as WalletTransaction).metadata, cancelledByRefund: true}
                    });
                    await manager.save(WalletTransaction, cancelFeeTx);
                }

                // واریز کل مبلغ به کاربر از صندوق پلتفرم
                await this.walletService.executeTransaction(
                    manager,
                    platformBankWallet,
                    WalletTransactionType.REFUND_OUT,
                    refundAmount,
                    `Refund for canceled order #${order.id} (From Platform Bank - Pending Cancelled)`,
                    order.id
                );

                await this.walletService.executeTransaction(
                    manager,
                    userWallet,
                    WalletTransactionType.REFUND_IN,
                    refundAmount,
                    `Refund for canceled order #${order.id}`,
                    order.id
                );

            }

            // 5️⃣ به‌روزرسانی وضعیت پرداخت
            payment.status = PaymentStatus.REFUNDED;
            payment.refundedAt = new Date();
            await manager.save(payment);

            order.transaction.status=TransactionStatus.REFUNDED
            await manager.save(Transaction,order.transaction)

            return {
                success: true,
                message: 'Order canceled successfully. Amount refunded to your wallet.',
                orderId: order.id,
                refundedAmount: refundAmount,
                newWalletBalance: Number(userWallet.balance)
            };
        });
    }

    async getCategoryWithProducts(tenantType:string): Promise<any> {

        const categories = await this.dataSource.getRepository(TenantCategory).find({
            relations: {
                // 1. Load children
                children: {
                    // 2. Load products for the children as well!
                    productTenantCategories: true
                },

                // 3. Load products for the parent (Main category)
                productTenantCategories: {
                    product: {
                        product: {
                            brand: true,
                        },
                        reviews: true,
                        features: true,
                        specifications: true,
                        tenant: true
                    }
                }
            },

            // Filter to get only categories that have at least one related record
            // where: {
            //     productTenantCategories: {
            //         id: Not(IsNull())
            //     }
            // },
            where: {
                productTenantCategories: {
                    product: {
                        tenant: {
                            type: TenantType.PHARMACY // اینجا از طریق product به tenant دسترسی پیدا می‌کنیم
                        }
                    }
                }
            },

            order: {createdAt: 'ASC'},
        } as any);

        // Manual Calculation: Add 'productCount' to children
        categories.forEach(category => {
            if (category.children && category.children.length > 0) {
                category.children.forEach(child => {
                    // حالا چون productTenantCategories را لود کردیم، طول آن را می‌گیریم
                    child.productCount = child.productTenantCategories ? child.productTenantCategories.length : 0;
                });
            }
        });

        return categories;
    }
}