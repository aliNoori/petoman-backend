import {
    BadRequestException,
    ConflictException,
    Injectable,
    InternalServerErrorException,
    NotFoundException
} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {DataSource, In, Repository} from 'typeorm';
import {ShopRequest} from "./shop-request.entity";
import {CreateRequestShopDto} from "./dto/create-request-shop.dto";
import {UpdateRequestShopDto} from "./dto/update-request-shop.dto";
import {User} from "../../../../shared/user/entities/user.entity";
import {Tenant, TenantType} from "../../../../core/entities/tenant.entity";
import {MarketSetting} from "../../settings/market-setting.entity";
import {InjectQueue} from "@nestjs/bull";
import {Queue} from "bull";
import {I18nService} from "nestjs-i18n";
import {NotificationType} from "../../../../shared/notification/notification.entity";
import {NotificationService} from "../../../../shared/notification/notification.service";
import {CreateReviewDto} from "../../review/create-review.dto";
import {ShopReview} from "../../review/shop-review.entity";
import {Order} from "../../../../shared/order/order.entity";
import {TenantCategory} from "../../category/tenant-category.entity";
import {getTenantTypeLabel} from "../../../../common/helper/helpers";
import {AuditLog} from "../../../../shared/request/entities/tenant-request.entity";


@Injectable()
export class UserShopService {
    constructor(
        private readonly i18n: I18nService,
        @InjectQueue('send-sms') private smsQueue: Queue, // تزریق صف
        @InjectQueue('notifications') private notificationQueue: Queue,
        private notifService: NotificationService,
        @InjectRepository(ShopRequest) private shopRepo: Repository<ShopRequest>,
        @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
        private readonly dataSource: DataSource,
        @InjectRepository(MarketSetting) private settingRepo: Repository<MarketSetting>,
    @InjectRepository(TenantCategory) private categoryRepo: Repository<TenantCategory>,

    ) {
    }

    /**
     * Get all settings for a specific tenant as a single object
     */
    async getAllSettings(shopId:string) {

        const settings = await this.settingRepo.find({
            where: { tenantId:shopId }
        });

        // Convert array of key-values to a single object
        const result: any = {};
        settings.forEach(item => {
            result[item.key] = item.value;
        });

        return result;
    }

    /**
     * Retrieve all tenants (shops)
     */
    async findAll(): Promise<Tenant[]> {
        return this.tenantRepo.find({
            where:{status:'active',type:TenantType.MARKET},
            relations: ['tenantUsers','tenantAddress','reviews.user','marketProducts.reviews',
                'marketProducts.product','marketProducts.product.brand',
                'marketProducts.features','marketProducts.specifications','settings']
            // select: ['id', 'name', 'type']
        });
    }

    /**
     * Retrieve all shop requests for a specific user, converting category UUIDs to titles.
     */
    async findAllForMe(userId: string): Promise<any[]> {
        // ۱. دریافت لیست درخواست‌ها
        const requests = await this.shopRepo.find({
            where: { userId: userId },
        });

        if (!requests || requests.length === 0) {
            return [];
        }

        // ۲. استخراج تمام UUIDهای دسته‌بندی‌ها از تمام درخواست‌ها
        const allCategoryIds = new Set<string>();
        requests.forEach((req) => {
            if (req.categories && Array.isArray(req.categories)) {
                req.categories.forEach((catId: string) => {
                    if (catId) allCategoryIds.add(catId);
                });
            }
        });

        const uniqueCategoryIds = Array.from(allCategoryIds);

        // ۳. دریافت نام دسته‌بندی‌ها از دیتابیس
        let categoryMap: Record<string, string> = {};
        if (uniqueCategoryIds.length > 0) {
            const categories = await this.categoryRepo.find({
                where: { id: In(uniqueCategoryIds) },
                select: ['id', 'title'] // فرض بر این است که فیلد نام 'title' است. اگر 'name' است، آن را تغییر دهید.
            });

            // تبدیل به Map برای دسترسی سریع: { 'uuid': 'نام دسته‌بندی' }
            categoryMap = categories.reduce((acc, cat) => {
                acc[cat.id] = cat.title;
                return acc;
            }, {} as Record<string, string>);
        }

        // ۴. تبدیل UUIDها به نام‌ها در پاسخ نهایی
        return requests.map((request) => {
            // کپی آبجکت برای جلوگیری از تغییر مستقیم در Entity (اگر کشینگ فعال باشد مهم است)
            const plainReq = { ...request };

            if (plainReq.categories && Array.isArray(plainReq.categories)) {
                plainReq.categories = plainReq.categories.map((catId: string) => {
                    // اگر نام پیدا شد، نام را برگردان، وگرنه خود UUID را نگه دار
                    return categoryMap[catId] || catId;
                });
            } else {
                plainReq.categories = [];
            }

            return plainReq;
        });
    }

    /**
     * _Create a new shop request_
     * This corresponds to the 'createShopRequest' logic in the frontend store
     */
    async addRequestForShop(dto: CreateRequestShopDto, user: User,deviceInfo?:any): Promise<{
        success: boolean;
        message: string;
        data?: ShopRequest
    }> {
        // ────────────── ۰. بررسی وضعیت درخواست‌های قبلی ──────────────
        // این بررسی خارج از تراکنش انجام می‌شود تا از باز کردن تراکنش‌های غیرضروری جلوگیری شود
        const existingRequest = await this.shopRepo.findOne({
            where: {
                userId: user.id,
                status: In(['approved', 'pending']),
            },
            order: { createdAt: 'DESC' },
        });

        /*if (existingRequest) {
            if (existingRequest.status === 'approved') {

                // ارسال نوتیفیکیشن برای درخواست تایید شده قبلی
                await this.notifService.create({
                    userId: user.id,
                    type: NotificationType.IN_APP,
                    title: await this.i18n.t('shop.notif.already_approved_title'),
                    message: await this.i18n.t('shop.notif.already_approved_message'),
                    icon: 'ti ti-info-circle text-blue-600',
                    color: 'bg-blue-100',
                    panelType: `${existingRequest.type}`
                });

                throw new ConflictException(
                    await this.i18n.t('shop.request.already_approved')
                );
            }
            if (existingRequest.status === 'pending') {

                // ارسال نوتیفیکیشن برای درخواست در حال بررسی قبلی
                await this.notifService.create({
                    userId: user.id,
                    type: NotificationType.IN_APP,
                    title: await this.i18n.t('shop.notif.already_pending_title'),
                    message: await this.i18n.t('shop.notif.already_pending_message'),
                    icon: 'ti ti-clock text-orange-600',
                    color: 'bg-orange-100',
                    panelType: `${existingRequest.type}`
                });

                throw new ConflictException(
                    await this.i18n.t('shop.request.already_pending', { lang: 'fa' })
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
            const newRequest = queryRunner.manager.create(ShopRequest, {
                ...dto,
                userId: user.id,
                auditLog:auditLog,
                status: 'pending',
            });

            // ۲. ذخیره در دیتابیس
            // ابتدا ذخیره می‌کنیم (بدون relation)
            const savedRequest = await queryRunner.manager.save(newRequest);

            // سپس رکورد ذخیره شده را دوباره با relation لود می‌کنیم
            const requestWithUser = await queryRunner.manager.findOne(ShopRequest, {
                where: { id: savedRequest.id },
                relations: ['user'], // لود کردن رابطه کاربر
            }as any);

            // اگر کاربری پیدا نشد (نباید پیش بیاید ولی برای اطمینان)
            if (!requestWithUser?.user) {
                throw new Error('User not found for this request');
            }

            // ────────────── ۴. مپ کردن Category IDs به Titles (مشابه findAllForMe) ──────────────
            // این بخش دقیقاً منطق پیدا کردن نام دسته‌ها را پیاده‌سازی می‌کند
            let categoryMap: Record<string, string> = {};

            // استخراج IDهای دسته‌بندی از درخواست جدید
            const newCategoryIds = new Set<string>();
            if (dto.categories && Array.isArray(dto.categories)) {
                dto.categories.forEach((catId: string) => {
                    if (catId) newCategoryIds.add(catId);
                });
            }

            // اگر دسته‌بندی وجود دارد، نام آن‌ها را از دیتابیس بگیر
            const uniqueNewCategoryIds = Array.from(newCategoryIds);
            if (uniqueNewCategoryIds.length > 0) {
                const categories = await this.categoryRepo.find({
                    where: { id: In(uniqueNewCategoryIds) },
                    select: ['id', 'title'] // فرض بر این است که فیلد نام 'title' است
                });

                // تبدیل به Map برای دسترسی سریع
                categoryMap = categories.reduce((acc, cat) => {
                    acc[cat.id] = cat.title;
                    return acc;
                }, {} as Record<string, string>);
            }

            // جایگزینی UUID با Title در آبجکت پاسخ نهایی
            // ما یک کپی از savedRequest می‌سازیم تا entity اصلی دستکاری نشود
            const plainResponse = { ...savedRequest } as any;

            if (plainResponse.categories && Array.isArray(plainResponse.categories)) {
                plainResponse.categories = plainResponse.categories.map((catId: string) => {
                    return categoryMap[catId] || catId; // اگر نام پیدا شد، نام را برگردان
                });
            } else {
                plainResponse.categories = [];
            }

            // ۳. ارسال نوتیفیکیشن
            await this.notifService.create({
                userId: user.id,
                type: NotificationType.IN_APP,
                title: await this.i18n.t('shop.notif.create_title', { args: { type:getTenantTypeLabel(dto.type.toUpperCase())} }),
                message: await this.i18n.t('shop.notif.create_message',{ args: { type:getTenantTypeLabel(dto.type.toUpperCase())} }),
                icon: 'ti ti-check text-green-600',
                color: 'bg-green-100',
                panelType: `${dto.type}`
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

            // ۷. افزودن job به صف
            await this.smsQueue.add('handle-send-sms', {
                phoneNumber: requestWithUser.user.phoneNumber,
                message:await this.i18n.t('shop.notif.create_message',{ args: { type:getTenantTypeLabel(dto.type.toUpperCase())} }),
            });

            // ۵. تایید نهایی تراکنش
            await queryRunner.commitTransaction();

            return {
                success: true,
                message: await this.i18n.t('shop.request.created_success',{ args: { type:getTenantTypeLabel(dto.type.toUpperCase())} }),
                data: plainResponse,
            };
        } catch (error) {
            // ۶. در صورت بروز خطا، تغییرات را برگردان
            await queryRunner.rollbackTransaction();
            console.error('Error creating shop request:', error);

            // اگر خطا از نوع ConflictException بود (که در مرحله ۰ پرتاب کردیم)، همان را ارسال کن
            if (error instanceof ConflictException) {
                throw error;
            }

            throw new InternalServerErrorException(
                await this.i18n.t('shop.request.creation_failed',{ args: { type:getTenantTypeLabel(dto.type.toUpperCase())} })
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
    async updateRequestForShop(requestId: string, dto: UpdateRequestShopDto, userId: string): Promise<{
        data: ShopRequest;
        success: boolean;
        message: string
    }> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // ۱. یافتن درخواست در داخل تراکنش
            const request = await queryRunner.manager.findOne(ShopRequest, {
                where: { id: requestId },
                relations: ['user']
            } as any);

            if (!request) {
                throw new NotFoundException(await this.i18n.t('shop.request.not_found'));
            }

            // ۲. بررسی دسترسی
            if (request.userId !== userId) {
                throw new BadRequestException(await this.i18n.t('shop.request.no_permission'));
            }

            // ۳. بررسی وضعیت
            if (request.status === 'approved') {
                throw new BadRequestException(await this.i18n.t('shop.request.can_not_edit_approved'));
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
            const { documents, ...otherData } = dto;
            Object.assign(request, otherData);

            // ۶. ریست کردن وضعیت به pending
            request.status = 'pending';

            // ۷. ذخیره تغییرات
            const savedRequest = await queryRunner.manager.save(request);

            // ۸. ارسال نوتیفیکیشن
            await this.notifService.create({
                userId: request.userId,
                type: NotificationType.IN_APP,
                title: await this.i18n.t('shop.notif.update_title',{args: {type: getTenantTypeLabel(request.type.toUpperCase())}}),
                message: await this.i18n.t('shop.notif.update_message',{args: {type: getTenantTypeLabel(request.type.toUpperCase())}}),
                icon: 'ti ti-device-floppy text-blue-600', // آیکون ذخیره آبی
                color: 'bg-blue-100',
                panelType: 'MARKET'//`${request.type}`
            });

            // ۷. افزودن job به صف
            await this.smsQueue.add('handle-send-sms', {
                phoneNumber: savedRequest.user.phoneNumber,
                message:await this.i18n.t('shop.notif.update_message',{args: {type: getTenantTypeLabel(request.type.toUpperCase())}}),
            });

            // ۱۰. تایید نهایی تراکنش
            await queryRunner.commitTransaction();

            return {
                success: true,
                message: await this.i18n.t('shop.request.update_success',{args: {type: getTenantTypeLabel(request.type.toUpperCase())}}),
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
     * Create review for a purchased shop
     */
    async createReview(
        tenantId: string,
        userId: string,
        dto: CreateReviewDto,
    ) {
        return this.dataSource.transaction(async (manager) => {

            // 1️⃣ بررسی وجود خرید کاربر از این فروشگاه
            // فرض: شما انتیتی Order دارید که فیلد tenantId (یا shopId) و userId را دارد
            const hasPurchased = await manager.exists(Order, {
                where: {
                    userId: userId,
                    tenantId: tenantId, // یا shopId بسته به نام فیلد در دیتابیس شما
                    // اختیاری: بررسی وضعیت سفارش (مثلاً فقط سفارش‌های تحویل شده)
                    // status: 'DELIVERED'
                }
            });

            if (!hasPurchased) {
                throw new BadRequestException('شما هنوز از این فروشگاه خریدی انجام نداده‌اید و امکان ثبت نظر وجود ندارد.');
            }

            // 2️⃣ بررسی اینکه کاربر قبلاً نظر ثبت نکرده باشد (اختیاری اما توصیه شده)
            const existingReview = await manager.exists(ShopReview, {
                where: {
                    userId: userId,
                    tenantId: tenantId,
                }
            });

            if (existingReview) {
                throw new BadRequestException('شما قبلاً برای این فروشگاه نظر ثبت کرده‌اید.');
            }

            // 3️⃣ ایجاد نظر
            const review = manager.create(ShopReview, {
                tenantId,
                userId,
                rating: dto.rating,
                comment: dto.comment,
                pros: dto.pros,
                cons: dto.cons,
                isApproved: false,
            });

            return manager.save(review);
        });
    }
}