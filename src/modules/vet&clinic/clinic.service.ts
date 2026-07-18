import {BadRequestException, Injectable, InternalServerErrorException, NotFoundException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {EventEmitter2} from '@nestjs/event-emitter';
import {DataSource, EntityManager, Repository} from 'typeorm';
import {Tenant, TenantType} from "../../core/entities/tenant.entity";
import {Appointment, AppointmentStatus, AppointmentType} from "./entities/appointment.entity";
import {Pet} from "./entities/pet.entity";
import {UpdatePricingDto, UpdateVetClinicInfoDto} from "../../shared/request/dto/tenant-settings.dto";
import {ChangePasswordDto} from "../../shared/user/dto/password.dto";
import {SettingKey, TenantSetting} from "../../shared/request/entities/tenant-setting.entity";
import {TenantContext} from "../../tenants/tenant-context.service";
import {
    RequestStatus,
    TenantSettingChangeRequest
} from "../../shared/request/entities/tenant-setting-change-request.entity";
import {ServiceStatus, VetClinicServiceEntity} from "./entities/service.entity";
import {CreateServiceDto, UpdateServiceDto} from "./dto/vet-clinic-service.dto";
import {Consultation, ConsultationStatus} from "../../socket/consultation/consultation.entity";
import {VerifyExamCodeDto} from "./dto/verify-exam-code.dto";
import {TenantReview} from "../../shared/reviews/tenant-review.entity";
import {ChangeAppointmentStatusDto} from "./dto/change-status-appointment-dto";
import {TimeOffBlock} from "./entities/time-off.entity";
import {CreateTimeOffDto} from "./dto/time-off.dto";
import {ClinicCapacityService} from "./clinic-capacity.service";
import {AppointmentQueue, QueueStatus} from "./appointment/entities/appointment-queue.entity";
import {OrderStatus} from "../../shared/order/order-status.enum";
import {Order} from "../../shared/order/order.entity";
import {WalletService} from "../../shared/wallet/wallet.service";
import {Wallet, WalletType} from "../../shared/wallet/wallet.entity";
import {WalletTransaction, WalletTransactionType} from "../../shared/wallet/wallet-transaction.entity";
import {Payment} from "../../shared/gateways/payments/payment.entity";
import {Medicine} from "../../shared/medicine/medicine.entity";
import {I18nService} from "nestjs-i18n";
import {TenantSpecialty} from "../../core/entities/tenant-specialty.entity";
import {NotificationType} from "../../shared/notification/notification.entity";
import {User} from "../../shared/user/entities/user.entity";
import {NotificationService} from "../../shared/notification/notification.service";
import {InjectQueue} from "@nestjs/bull";
import {Queue} from "bull";


@Injectable()
export class VetClinicService {
    constructor(
        private notifService: NotificationService,
        @InjectQueue('send-sms') private smsQueue: Queue,
        private readonly i18n: I18nService,
        private tenantContext: TenantContext,
        private eventEmitter: EventEmitter2,
        @InjectRepository(Tenant) private tenantRepository: Repository<Tenant>,
        @InjectRepository(TenantSetting) private tenantSettingRepository: Repository<TenantSetting>,
        @InjectRepository(Appointment) private appointmentRepository: Repository<Appointment>,
        @InjectRepository(Consultation) private consultationRepository: Repository<Consultation>,
        @InjectRepository(AppointmentQueue) private queueRepository: Repository<AppointmentQueue>,
        @InjectRepository(Pet) private petRepository: Repository<Pet>,
        @InjectRepository(Order) private orderRepository: Repository<Order>,
        @InjectRepository(VetClinicServiceEntity)
        private vetClinicServiceRepository: Repository<VetClinicServiceEntity>,
        @InjectRepository(TenantReview)
        private tenantReviewRepository: Repository<TenantReview>,
        @InjectRepository(TimeOffBlock)
        private timeOffRepository: Repository<TimeOffBlock>,
        @InjectRepository(TenantSettingChangeRequest)
        private changeRequestRepository: Repository<TenantSettingChangeRequest>,
        private readonly clinicCapacityService: ClinicCapacityService,
        @InjectRepository(Wallet) private walletRepository: Repository<Wallet>,
        private readonly walletService: WalletService,
        @InjectRepository(Medicine) private medicineRepository: Repository<Medicine>,
        private dataSource: DataSource,
        @InjectRepository(TenantSpecialty) private specialityRepo: Repository<TenantSpecialty>,
    ) {
    }

    // ----------------------------------------------------------------
    // ۱. متدهای عمومی و مشاهده وضعیت (Read-Only)
    // ----------------------------------------------------------------

    /**
     * دریافت اطلاعات تننت
     */
    async getTenant(): Promise<Tenant | null> {
        const tenantId = this.tenantContext.getTenantId();
        const tenant = await this.tenantRepository.findOne({
            where: {id: tenantId},
            relations: ['tenantUsers.user', 'withdrawals', 'bankcards', 'tenantSettings', 'tenantServices']
        });

        if (!tenant) return null;

        if (tenant.type === TenantType.CLINIC || tenant.type === TenantType.VET) {

            const clinicSetting = tenant.tenantSettings?.find(
                setting => setting.key === SettingKey.CLINIC_INFO
            );

            if (clinicSetting) {
                // ۲. استخراج ID تخصص از value
                // فرض می‌کنیم ساختار value به این صورت است: { name: '...', speciality: 'uuid-xxx' }
                const specialityId = clinicSetting.value?.speciality;

                if (specialityId) {
                    // ۳. پیدا کردن نام تخصص از دیتابیس
                    const speciality = await this.specialityRepo.findOne({
                        where: {id: specialityId},
                        select: ['label'] // فقط نام را بیاور تا سریع‌تر باشد
                    });

                    // ۴. جایگزینی ID با نام در آبجکت value
                    if (speciality) {
                        clinicSetting.value.speciality = speciality.label; // اضافه کردن نام
                    }
                }
            }
        }
        return tenant;
    }

    async findAllGlobalMedicine() {
        return this.medicineRepository.find()
    }

    /**
     * دریافت اطلاعات نوبت های تنت
     */
    async findAllTenantAppointment(): Promise<Appointment[] | null> {
        const tenantId = this.tenantContext.getTenantId();
        return this.appointmentRepository.find({
            where: {tenantId: tenantId},
            relations: ['tenant', 'pet.owner', 'doctor', 'order.address', 'consultation']
        } as any);
    }


    /**
     * دریافت اطلاعات نوبت های تنت
     */
    async findAllConsultationsForTenant(): Promise<Consultation[] | null> {
        const tenantId = this.tenantContext.getTenantId();
        return this.consultationRepository.find({
            where: {tenantId: tenantId},
            relations: ['messages', 'user', 'pet']
        } as any);
    }

    /**
     * دریافت تمام تنظیمات فعال کلینیک
     * (این متد فقط تنظیمات تایید شده را برمی‌گرداند)
     */
    /**
     * دریافت تمام تنظیمات تنیانت همراه با نام تخصص‌ها
     * این متد تنظیمات را می‌خواند و IDs تخصص‌ها را به نام‌های خوانا تبدیل می‌کند.
     */
    async getAllSettings(): Promise<any> {
        try {
            // دریافت شناسه تنیانت از context
            const tenantId = this.tenantContext.getTenantId();

            // 1. دریافت تمام تنظیمات مربوط به این تنیانت
            const settings = await this.tenantSettingRepository.find({
                where: { tenantId },
            });

            // 2. جمع‌آوری تمام IDهای تخصص موجود در تنظیمات
            // استفاده از Set برای جلوگیری از تکرار
            const specialityIds = new Set<string>();

            for (const setting of settings) {
                // بررسی ایمن برای وجود value و specialty
                if (setting.value && typeof setting.value === 'object' && 'specialty' in setting.value) {

                    const speciality = await this.specialityRepo.findOne({
                        where: {value: setting.value.specialty},
                        select: ['label'] // فقط نام را بیاور تا سریع‌تر باشد
                    });

                    if (speciality) {
                        specialityIds.add(speciality.id);
                    }
                }
            }

            // 3. دریافت نام تمام تخصص‌ها به صورت یک کوئری (Batch Loading)
            // این کار از انجام کوئری‌های متعدد درون حلقه جلوگیری می‌کند (N+1 Problem)
            let specialitiesMap: Record<string, string> = {};
            if (specialityIds.size > 0) {
                const specialities = await this.specialityRepo.find({
                    where: Array.from(specialityIds).map((id) => ({ id })),
                    select: ['id', 'label'], // فرض می‌کنیم فیلد نام، label است
                });

                // تبدیل آرایه تخصص‌ها به یک آبجکت برای دسترسی سریع O(1)
                // ساختار: { 'uuid-1': 'تخصص 1', 'uuid-2': 'تخصص 2', ... }
                specialitiesMap = specialities.reduce((acc, spec) => {
                    acc[spec.id] = spec.label;
                    return acc;
                }, {} as Record<string, string>);
            }

            // 4. ساخت آبجکت نهایی و جایگزینی ID با نام تخصص
            const result = {
                clinicInfo: {},
                visitPricing: {},
                phoneScheduleSettings: {},
            };

            settings.forEach((setting) => {
                // ابتدا اگر تخصص دارد، ID آن را به نام تبدیل کن
                // if (
                //     setting.value &&
                //     typeof setting.value === 'object' &&
                //     'specialty' in setting.value
                // ) {
                //     const specialtyId = setting.value.specialty;
                //     if (specialitiesMap[specialtyId]) {
                //         // جایگزینی ID با نام تخصص
                //         setting.value.specialty = specialitiesMap[specialtyId];
                //     }
                // }

                // سپس بر اساس کلید (Key)، تنظیمات را در آبجکت نتیجه قرار بده
                if (setting.key === SettingKey.CLINIC_INFO) {
                    result.clinicInfo = setting.value;
                } else if (setting.key === SettingKey.VISIT_PRICING) {
                    result.visitPricing = setting.value;
                } else if (setting.key === SettingKey.PHONE_SCHEDULE) {
                    result.phoneScheduleSettings = setting.value;
                }
            });

            return result;
        } catch (error) {
            // اگر خطا از نوع‌های شناخته شده باشد، آن را پرتاب می‌کنیم
            if (
                error instanceof BadRequestException ||
                error instanceof InternalServerErrorException
            ) {
                throw error;
            }

            // ثبت خطا برای دیباگ
            console.error('خطا در دریافت تنظیمات:', error);

            // پرتاب خطای عمومی سرور با پیام ترجمه شده
            throw new InternalServerErrorException(
                await this.i18n.translate('error.general.server_error')
            );
        }
    }

    // ----------------------------------------------------------------
    // ۲. متدهای ثبت درخواست تغییر (Request Changes)
    // ----------------------------------------------------------------

    /**
     * ثبت درخواست تغییر برای اطلاعات عمومی کلینیک
     */
    /**
     * ثبت درخواست تغییر اطلاعات کلینیک
     * این متد یک درخواست تغییر ایجاد می‌کند که نیاز به تایید ادمین دارد.
     */
    async requestUpdateClinicInfo(dto: UpdateVetClinicInfoDto): Promise<{ message: string }> {
        try {
            // دریافت شناسه تنیانت از context
            const tenantId = this.tenantContext.getTenantId();

            // بررسی اعتبار داده‌های ورودی (اختیاری اما توصیه شده)
            if (!dto || Object.keys(dto).length === 0) {
                throw new BadRequestException(
                    await this.i18n.translate('error.validation_error')
                );
            }

            // 1. بررسی وجود درخواست معلق (Pending) برای این تنیانت و کلید
            const existingPendingRequest = await this.changeRequestRepository.findOne({
                where: {
                    tenantId,
                    key: SettingKey.CLINIC_INFO,
                    status: RequestStatus.PENDING, // فقط وضعیت‌های در انتظار بررسی بررسی می‌شوند
                },
            });

            // اگر درخواستی در وضعیت Pending وجود دارد، خطا پرتاب می‌شود
            if (existingPendingRequest) {
                throw new BadRequestException(
                    await this.i18n.translate('error.request.pending_request_exists')
                    // فرض بر این است که کلید 'error.request.pending_request_exists' در فایل i18n شما تعریف شده است
                    // مثال پیام: "یک درخواست تغییر در حال بررسی است. لطفاً پس از تایید یا رد، درخواست جدید ثبت کنید."
                );
            }

            // دریافت مقدار فعلی تنظیمات کلینیک (برای ثبت تاریخچه تغییرات)
            const currentSetting = await this.tenantSettingRepository.findOne({
                where: {
                    tenantId,
                    key: SettingKey.CLINIC_INFO,
                },
            });

            // ایجاد رکورد جدید در جدول درخواست‌های تغییر
            const request = this.changeRequestRepository.create({
                tenantId,
                key: SettingKey.CLINIC_INFO,
                // مقدار پیشنهادی جدید
                proposedValue: dto,
                // مقدار فعلی (در صورت وجود)
                currentValue: currentSetting?.value || null,
                // وضعیت پیش‌فرض: در انتظار بررسی
                status: RequestStatus.PENDING,
            });

            // ذخیره درخواست در دیتابیس
            await this.changeRequestRepository.save(request);

            // بازگشت پیام موفقیت‌آمیز با استفاده از i18n
            return {
                message: await this.i18n.translate('tenant.request.request_submitted'),
                // اگر پیام موفقیت در فایل JSON تعریف نشده، می‌توانید از متن ثابت زیر استفاده کنید:
                // message: 'درخواست تغییر اطلاعات کلینیک ثبت شد.'
            };
        } catch (error) {
            // اگر خطا از نوع‌های شناخته شده باشد (مثل خطای اعتبارسنجی)، آن را پرتاب می‌کنیم
            if (error instanceof BadRequestException) {
                throw error;
            }

            // ثبت خطا برای دیباگ
            console.error('خطا در ثبت درخواست تغییر اطلاعات کلینیک:', error);

            // پرتاب خطای عمومی سرور با پیام ترجمه شده
            throw new InternalServerErrorException(
                await this.i18n.translate('error.general.server_error')
            );
        }
    }

    /**
     * ثبت درخواست تغییر برای قیمت‌گذاری‌ها و تنظیمات تماس
     * این متد دو درخواست همزمان ایجاد می‌کند (یکی برای قیمت ویزیت، یکی برای تماس)
     */
    async requestUpdatePricing(dto: UpdatePricingDto) {
        const tenantId = this.tenantContext.getTenantId();

        // ۱. پردازش درخواست برای VISIT_PRICING
        const currentVisitPricing = await this.tenantSettingRepository.findOne({
            where: {tenantId, key: SettingKey.VISIT_PRICING}
        });
        const visitRequest = this.changeRequestRepository.create({
            tenantId,
            key: SettingKey.VISIT_PRICING,
            proposedValue: dto.visitPricing,
            currentValue: currentVisitPricing ? currentVisitPricing.value : null,
            status: RequestStatus.PENDING
        });

        // ۲. پردازش درخواست برای PHONE_SCHEDULE
        const currentPhoneSchedule = await this.tenantSettingRepository.findOne({
            where: {tenantId, key: SettingKey.PHONE_SCHEDULE}
        });
        const phoneRequest = this.changeRequestRepository.create({
            tenantId,
            key: SettingKey.PHONE_SCHEDULE,
            proposedValue: dto.phoneScheduleSettings,
            currentValue: currentPhoneSchedule ? currentPhoneSchedule.value : null,
            status: RequestStatus.PENDING
        });

        // ذخیره هر دو درخواست
        await this.changeRequestRepository.save([visitRequest, phoneRequest]);

        return {message: 'درخواست تغییر قیمت‌ها و تنظیمات تماس ثبت شد.'};
    }

    // ----------------------------------------------------------------
    // ۴. سایر متدهای جانبی (Utility)
    // ----------------------------------------------------------------

    /**
     * تغییر رمز عبور
     */
    async changePassword(userId: string, dto: ChangePasswordDto) {
        // برای پیاده‌سازی کامل، باید UserRepository را تزریق کنید و از کد زیر استفاده کنید:
        /*
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('کاربر یافت نشد');

        const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);
        if (!isPasswordValid) throw new BadRequestException('رمز عبور فعلی اشتباه است');

        const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
        user.password = hashedPassword;
        await this.userRepository.save(user);
        */

        // کد موقت
        console.log(`Changing password for user ${userId}`);
        return {message: 'رمز عبور با موفقیت تغییر کرد.'};
    }

    //////////////////////=============== Service =================//////////////

    /**
     * دریافت لیست خدمات فعال و در انتظار تایید
     */
    async getServices() {
        const tenantId = this.tenantContext.getTenantId()
        return this.vetClinicServiceRepository.find({
            where: {tenantId, status: ServiceStatus.ACTIVE},
            order: {createdAt: 'DESC'}
        });
    }

    /**
     * ایجاد خدمت جدید (وضعیت پیش‌فرض Pending)
     */
    async createService(dto: CreateServiceDto): Promise<VetClinicServiceEntity> {
        try {
            // دریافت شناسه مشتری (Tenant) از контекست جاری
            const tenantId = this.tenantContext.getTenantId();

            // اعتبارسنجی اولیه داده‌ها: بررسی وجود نام و قیمت
            if (!dto.name || !dto.price) {
                // پرتاب خطای 400 با پیام ترجمه شده از فایل JSON
                throw new BadRequestException(
                    await this.i18n.translate('error.general.validation_error')
                );
            }

            // ایجاد نمونه جدید سرویس
            const newService = this.vetClinicServiceRepository.create({
                tenantId,
                name: dto.name,
                description: dto.description,
                // تبدیل قیمت به نوع مناسب (BigInt برای ستون‌های bigint در دیتابیس)
                // اگر ستون دیتابیس عددی معمولی است، از Number استفاده کنید
                price: dto.price,
                status: ServiceStatus.PENDING, // وضعیت پیش‌فرض: در انتظار تایید
            });

            // ذخیره سرویس جدید در دیتابیس
            return await this.vetClinicServiceRepository.save(newService);
        } catch (error) {
            // بررسی نوع خطا برای مدیریت بهتر
            if (error instanceof BadRequestException) {
                // اگر خطا قبلاً مدیریت شده، آن را دوباره پرتاب می‌کنیم
                throw error;
            }

            // ثبت خطا در لاگ‌ها برای دیباگ
            console.error('خطا در ایجاد سرویس:', error);

            // پرتاب خطای داخلی سرور با پیام عمومی و ترجمه شده
            // پیام 'general_error' در فایل JSON شما تعریف شده است
            throw new InternalServerErrorException(
                await this.i18n.translate('error.general_error')
            );
        }
    }

    /**
     * ویرایش خدمت (وضعیت به Pending تغییر می‌کند)
     * بررسی می‌کند که سرویس متعلق به تنیانت فعلی باشد.
     */
    async updateService(serviceId: string, dto: UpdateServiceDto): Promise<VetClinicServiceEntity> {
        try {
            // دریافت شناسه تنیانت از context
            const tenantId = this.tenantContext.getTenantId();

            // 1. جستجوی سرویس با شرط ID و TenantId
            const service = await this.vetClinicServiceRepository.findOne({
                where: {
                    id: serviceId,
                    tenantId: tenantId // اطمینان از اینکه سرویس متعلق به این تنیانت است
                },
            });

            // 2. بررسی وجود سرویس
            if (!service) {
                // اگر سرویس با این ID وجود ندارد یا متعلق به این تنیانت نیست
                throw new NotFoundException(
                    await this.i18n.translate('error.not_found')
                );
            }

            // 3. اعمال تغییرات
            Object.assign(service, dto);

            // 4. تغییر وضعیت به "در انتظار تایید"
            service.status = ServiceStatus.PENDING;

            // 5. ذخیره تغییرات
            return await this.vetClinicServiceRepository.save(service);
        } catch (error) {
            // مدیریت خطاهای خاص
            if (
                error instanceof NotFoundException ||
                error instanceof BadRequestException
            ) {
                throw error;
            }

            // ثبت خطا
            console.error('خطا در به‌روزرسانی سرویس:', error);

            // پرتاب خطای عمومی
            throw new InternalServerErrorException(
                await this.i18n.translate('error.general.server_error')
            );
        }
    }

    /**
     * حذف نرم (Soft Delete) یا غیرفعال‌سازی سرویس
     * بررسی می‌کند که سرویس متعلق به تنیانت فعلی باشد.
     */
    async deleteService(serviceId: string): Promise<void> {
        try {
            // دریافت شناسه تنیانت از context
            const tenantId = this.tenantContext.getTenantId();

            // 1. جستجوی سرویس با شرط ID و TenantId
            const service = await this.vetClinicServiceRepository.findOne({
                where: {
                    id: serviceId,
                    tenantId: tenantId // اطمینان از اینکه سرویس متعلق به این تنیانت است
                },
            });

            // 2. بررسی وجود سرویس
            if (!service) {
                throw new NotFoundException(
                    await this.i18n.translate('error.not_found')
                );
            }

            // 3. تغییر وضعیت به "غیرفعال"
            service.status = ServiceStatus.INACTIVE;

            // 4. ذخیره تغییرات
            await this.vetClinicServiceRepository.save(service);
        } catch (error) {
            // مدیریت خطاهای خاص
            if (
                error instanceof NotFoundException ||
                error instanceof BadRequestException
            ) {
                throw error;
            }

            // ثبت خطا
            console.error('خطا در حذف/غیرفعال‌سازی سرویس:', error);

            // پرتاب خطای عمومی
            throw new InternalServerErrorException(
                await this.i18n.translate('error.server_error')
            );
        }
    }


    async changeStatusTenantAppointment(appointmentId: string, dto: ChangeAppointmentStatusDto) {
        const appointment = await this.appointmentRepository.findOne({
            where: {id: appointmentId},
            relations: ['order', 'consultation']
        });

        if (!appointment) {
            throw new NotFoundException('نوبت یافت نشد');
        }

        ///
        const sendNotif = async (
            manager: EntityManager, // اطمینان از استفاده از manager صحیح (درون تراکنش یا خارج از آن)
            targetUserId: string,
            typeKey: string,
            extraArgs: Record<string, any> = {}
        ) => {
            const isCustomer = typeKey.includes('customer');
            const userType = isCustomer ? 'VET-CLINIC-PHARMACY' : 'VET-CLINIC-ADMIN';

            // ساخت کلید کامل برای i18n
            const keyPrefix = `appointment.notif.${typeKey}`;

            // دریافت عنوان و متن از i18n
            const title = await this.i18n.t(`${keyPrefix}.title`);
            const message = await this.i18n.t(`${keyPrefix}.message`, {
                args: {
                    serviceType: extraArgs.serviceType || '',
                    orderCode: String(extraArgs.orderCode || ''),
                    tenantName: String(extraArgs.tenantName || ''),
                    examCode: String(extraArgs.examCode || ''),
                    amount: String(extraArgs.amount || ''),
                    ...extraArgs
                }
            });
            const sms = await this.i18n.t(`${keyPrefix}.sms`, {
                args: {
                    serviceType: extraArgs.serviceType || '',
                    orderCode: String(extraArgs.orderCode || ''),
                    amount: String(extraArgs.amount || ''),
                    ...extraArgs
                }
            });

            await this.sendNotificationAndSms(
                manager,
                targetUserId,
                title as string,
                message as string,
                sms as string,
                userType
            );
        };
        ///
        // استخراج داده‌های مشترک برای استفاده در تمام حالت‌ها
        const tenantName = appointment.tenant?.name || appointment.tenant?.ownerName || 'کلینیک';
        const orderCode = appointment.order?.orderCode || 'N/A';
        const serviceTypeText = appointment?.type === AppointmentType.HOME_VISIT ? 'ویزیت در منزل' : 'ویزیت حضوری';
        const examCode = appointment.examCode || 'N/A';
        const amount = appointment.order?.totalAmount || 0;

        // متغیرهای مشترک برای ارسال نوتیفیکیشن
        const baseNotifArgs = {
            serviceType: serviceTypeText,
            tenantName: tenantName,
            orderCode: orderCode,
            examCode: examCode,
            amount: amount
        };

        const currentManager = this.dataSource.manager;

        if (dto.status === 'approved') {
            appointment.status = AppointmentStatus.CONFIRMED;

            if (appointment.consultation) {
                appointment.consultation.status = ConsultationStatus.PENDING;
                // اصلاح: استفاده از consultationRepository
                await this.consultationRepository.save(appointment.consultation);
            }



            if (appointment.order) {
                await sendNotif(currentManager, appointment.order.userId, 'appointment_approved.customer', baseNotifArgs);
                if (appointment.tenant?.ownerUserId) {
                    await sendNotif(currentManager, appointment.tenant.ownerUserId, 'appointment_approved.clinic', baseNotifArgs);
                }
            }

        } else if (dto.status === 'in-chat') {
            appointment.status = AppointmentStatus.IN_CHAT;

            // ارسال نوتیفیکیشن شروع چت
            if (appointment.order) {
                await sendNotif(currentManager, appointment.order.userId, 'appointment_in_chat.customer', baseNotifArgs);
                if (appointment.tenant?.ownerUserId) {
                    await sendNotif(currentManager, appointment.tenant.ownerUserId, 'appointment_in_chat.clinic', baseNotifArgs);
                }
            }

            /*if (appointment.consultation) {
                appointment.consultation.status = ConsultationStatus.ACTIVE;
                // اصلاح: استفاده از consultationRepository
                await this.consultationRepository.save(appointment.consultation);
            }*/
        } else if (dto.status === 'cancelled') {

            // --- شروع تغییرات برای برگشت وجه ---
            if (appointment.order) {

                await this.dataSource.transaction(async (manager) => {
                    // 1. آپدیت وضعیت نوبت و سفارش
                    appointment.status = AppointmentStatus.CANCELLED;
                    appointment.cancelledReason = dto.reason || '';
                    appointment.order.status = OrderStatus.REJECTED;
                    await manager.save(Appointment, appointment);
                    await manager.save(Order, appointment.order);

                    const refundAmount = Number(appointment.order.totalAmount);
                    const userId = appointment.order.userId;
                    const tenantId = appointment.order.tenantId;

                    if (refundAmount <= 0) return;

                    // محاسبه سهم‌ها
                    const platformFeePercent = 5;
                    const feeAmount = (refundAmount * platformFeePercent) / 100;
                    const shopNetAmount = refundAmount - feeAmount;

                    // 2. یافتن Payment مربوط به این سفارش
                    const payment = await manager.findOne(Payment, {
                        where: {orderId: appointment.order.id}
                    } as any);
                    if (!payment) {
                        throw new BadRequestException('پرداختی برای این سفارش یافت نشد');
                    }

                    // 3. تشخیص حالت: آیا تسویه‌حساب انجام شده است؟
                    const pendingCreditTx = await manager.findOne(WalletTransaction, {
                        where: {
                            referenceId: payment.id,
                            type: WalletTransactionType.PENDING_CREDIT
                        }
                    } as any);
                    const pendingFeeTx = await manager.findOne(WalletTransaction, {
                        where: {
                            referenceId: payment.id,
                            type: WalletTransactionType.PENDING_FEE
                        }
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

                    const isSettled = !pendingCreditTx && !pendingFeeTx;

                    // 4. یافتن کیف پول‌ها با استفاده از WalletService
                    // نکته: برای UserWallet اگر وجود نداشته باشد باید ساخته شود، اما getWallet ممکن است خطا دهد.
                    // ما از try/catch یا چک دستی استفاده می‌کنیم تا با کد قبلی سازگار بمانیم.

                    let userWallet: Wallet;
                    try {
                        userWallet = await this.walletService.getWallet(
                            undefined,
                            userId,
                            WalletType.USER,
                            manager
                        );
                    } catch (e) {
                        // اگر کیف پول کاربر وجود نداشت، طبق کد قبلی می‌سازیم
                        userWallet = manager.create(Wallet, {
                            userId,
                            type: WalletType.USER,
                            balance: 0,
                            status: 'ACTIVE'
                        });
                        await manager.save(Wallet, userWallet);
                    }

                    if (isSettled) {
                        // --- حالت دوم: پول پخش شده (تسویه شده) ---

                        // یافتن کیف پول فروشنده
                        const shopWallet = await this.walletService.getWallet(
                            tenantId,
                            undefined,
                            WalletType.SHOP,
                            manager
                        );
                        if (!shopWallet) {
                            throw new BadRequestException(await this.i18n.t('wallet.shop_not_found'));
                        }

                        // برداشت از SHOP با استفاده از executeTransaction
                        await this.walletService.executeTransaction(
                            manager,
                            shopWallet,
                            WalletTransactionType.REFUND_OUT, // یا DEBIT بسته به تعریف تایپ شما
                            shopNetAmount,
                            await this.i18n.t('wallet.transaction_refund_shop_out',
                                {args:{trackingCode:appointment.trackingCode}}),
                            appointment.order.id
                        );

                        // یافتن کیف پول پلتفرم (Petoman)
                        const platformWallet = await this.walletService.getWallet(
                            undefined,
                            undefined,
                            WalletType.PETOMAN,
                            manager
                        );
                        if (!platformWallet) {
                            throw new BadRequestException(await this.i18n.t('wallet.platform_not_found'));
                        }

                        // برداشت از PETOMAN با استفاده از executeTransaction
                        await this.walletService.executeTransaction(
                            manager,
                            platformWallet,
                            WalletTransactionType.REFUND_OUT,
                            feeAmount,
                            await this.i18n.t('wallet.transaction_refund_fee_out',
                                {args:{trackingCode:appointment.trackingCode}}),
                            appointment.order.id
                        );

                    } else {
                        // --- حالت اول: پول هنوز در PLATFORM_BANK است ---

                        // الف) لغو تراکنش Pending Credit (سهم فروشنده)
                        if (pendingCreditTx) {
                            const cancelCreditTx = manager.create(WalletTransaction, {
                                walletId: pendingCreditTx.walletId,
                                type: WalletTransactionType.CANCEL_CREDIT, // تایپ جدید برای لغو
                                amount: pendingCreditTx.amount,
                                balanceAfter: pendingCreditTx.balanceAfter, // موجودی تغییر نمی‌کند
                                description: await this.i18n.t('wallet.transaction_cancel_pending_credit',
                                    {args:{trackingCode:appointment.trackingCode}}),
                                referenceId: appointment.order.id,
                                metadata: {cancelledByRefund: true}
                            });
                            await manager.save(WalletTransaction, cancelCreditTx);
                        }

                        // ب) لغو تراکنش Pending Fee (سهم پلتفرم)
                        if (pendingFeeTx) {
                            const cancelFeeTx = manager.create(WalletTransaction, {
                                walletId: pendingFeeTx.walletId,
                                type: WalletTransactionType.CANCEL_FEE, // تایپ جدید برای لغو
                                amount: pendingFeeTx.amount,
                                balanceAfter: pendingFeeTx.balanceAfter,
                                description: await this.i18n.t('wallet.transaction_cancel_pending_fee',
                                    {args:{trackingCode:appointment.trackingCode}}),
                                referenceId: appointment.order.id,
                                metadata: {cancelledByRefund: true}
                            });
                            await manager.save(WalletTransaction, cancelFeeTx);
                        }

                        // یافتن کیف پول صندوق پلتفرم
                        const platformBankWallet = await this.walletService.getWallet(
                            undefined,
                            undefined,
                            WalletType.PLATFORM_BANK,
                            manager
                        );
                        if (!platformBankWallet) {
                            throw new BadRequestException(await this.i18n.t('wallet.bank_not_found'));
                        }

                        // برداشت از PLATFORM_BANK با استفاده از executeTransaction
                        await this.walletService.executeTransaction(
                            manager,
                            platformBankWallet,
                            WalletTransactionType.REFUND_OUT,
                            refundAmount,
                            await this.i18n.t('wallet.transaction_refund_bank_out_unsettled',
                                {args:{trackingCode:appointment.trackingCode}}),
                            appointment.order.id
                        );
                    }

                    // 5. واریز به کیف پول کاربر (در هر دو حالت)
                    // با استفاده از executeTransaction
                    await this.walletService.executeTransaction(
                        manager,
                        userWallet,
                        WalletTransactionType.REFUND_IN, // یا CREDIT
                        refundAmount,
                        await this.i18n.t('wallet.transaction_refund_fee_out',
                            {args:{trackingCode:appointment.trackingCode}}),
                        appointment.order.id
                    );

                    await sendNotif(manager, userId, 'appointment_cancelled.customer', { ...baseNotifArgs, amount: refundAmount });
                    if (appointment.tenant?.ownerUserId) {
                        await sendNotif(manager, appointment.tenant.ownerUserId, 'appointment_cancelled.clinic', { ...baseNotifArgs, amount: refundAmount });
                    }
                }); // پایان تراکنش
            }

        } else if (dto.status === 'completed') {
            const currentManager = this.dataSource.manager;

            appointment.status = AppointmentStatus.COMPLETED;
            appointment.duration = dto.duration
            appointment.completedAt = dto.completedAt
            if (appointment.order) {
                appointment.order.status = OrderStatus.CUSTOMER_DELIVERED;
                await this.orderRepository.save(appointment.order)
                // ارسال نوتیفیکیشن تکمیل

                await sendNotif(currentManager, appointment.order.userId, 'appointment_completed.customer', baseNotifArgs);
                if (appointment.tenant?.ownerUserId) {
                    await sendNotif(currentManager, appointment.tenant.ownerUserId, 'appointment_completed.clinic', baseNotifArgs);
                }
            }

        } else if (dto.status === 'in-progress') {
            appointment.status = AppointmentStatus.IN_PROGRESS;
            appointment.appointmentDate = dto.appointmentDate

            if (appointment.order) {
                await sendNotif(currentManager, appointment.order.userId, 'appointment_in_progress.customer', baseNotifArgs);
                if (appointment.tenant?.ownerUserId) {
                    await sendNotif(currentManager, appointment.tenant.ownerUserId, 'appointment_in_progress.clinic', baseNotifArgs);
                }
            }

        }

        return await this.appointmentRepository.save(appointment);
    }

    async activeTenantConsultation(consultationId: string) {
        const consultation = await this.consultationRepository.findOne({where: {id: consultationId}});
        if (!consultation) {
            throw new NotFoundException('اتاق یافت نشد');
        }

        // آپدیت فیلدها
        consultation.status = ConsultationStatus.ACTIVE

        return await this.consultationRepository.save(consultation);
    }

    async verifyExamCode(appointmentId: string, dto: VerifyExamCodeDto) {
        // 1. پیدا کردن نوبت با شناسه
        const appointment = await this.appointmentRepository.findOne({
            where: {id: appointmentId},
            relations: ['pet', 'pet.owner', 'order', 'order.address'] // لود کردن روابط برای نمایش اطلاعات
        });

        if (!appointment) {
            throw new NotFoundException('نوبت یافت نشد');
        }

        // 2. بررسی اینکه آیا کد وارد شده با کد دیتابیس مطابقت دارد؟
        // نکته: چون کد یکتاست، می‌توانیم مستقیم مقایسه کنیم
        if (appointment.examCode !== dto.examCode) {
            throw new BadRequestException('کد معاینه اشتباه است');
        }

        // 3. بررسی اینکه آیا قبلا تایید شده است؟
        if (appointment.examCodeVerified) {
            throw new BadRequestException('این کد قبلاً تایید شده است');
        }

        // 4. آپدیت کردن وضعیت نوبت
        appointment.examCodeVerified = true;
        // می‌توانید وضعیت را هم به CONFIRMED تغییر دهید اگر لازم است
        // appointment.status = AppointmentStatus.CONFIRMED;

        await this.appointmentRepository.save(appointment);

        // 5. بازگرداندن اطلاعات مورد نیاز برای نمایش مودال (آدرس و...)
        return {
            success: true,
            message: 'کد معاینه تایید شد',
            customerName: appointment.pet?.owner?.firstName+' . '+ appointment.pet?.owner?.lastName|| '',
            phone: appointment.pet?.owner?.phoneNumber || '',
            // فرض بر این است که آدرس در order.address یا locationData ذخیره شده
            address: appointment.order?.address?.fullAddress || appointment.order?.address?.fullAddress || '',
            notes: appointment.description
        };
    }

    /**
     * دریافت لیست تمام نظرات مربوط به تننت جاری
     * از بارگذاری همزمان روابط سنگین خودداری می‌کند تا خطای Memory رخ ندهد.
     */
    async findAllReviewsForTenant() {
        const tenantId = this.tenantContext.getTenantId();

        // دریافت نظرات با جزئیات کاربر (بدون بارگذاری Appointment یا Order برای جلوگیری از Loop)
        return await this.tenantReviewRepository.find({
            where: {tenantId: tenantId},
            relations: ['user', 'visit.pet'], // فقط رابطه کاربر را لود می‌کنیم
            order: {createdAt: 'DESC'} // مرتب‌سازی از جدید به قدیم
        });
    }

    /**
     * پاسخ دادن به یک نظر خاص توسط تننت
     */
    async replyTenantReview(reviewId: string, replyText: string) {
        // ۱. بررسی وجود نظر
        const review = await this.tenantReviewRepository.findOne({
            where: {id: reviewId}
        });

        if (!review) {
            throw new NotFoundException('نظر مورد نظر یافت نشد');
        }

        // ۲. بررسی اینکه آیا این نظر متعلق به تننت جاری است؟ (اختیاری اما برای امنیت توصیه می‌شود)
        const currentTenantId = this.tenantContext.getTenantId();
        if (review.tenantId !== currentTenantId) {
            throw new BadRequestException('شما اجازه پاسخ به این نظر را ندارید');
        }

        // ۳. ثبت پاسخ
        review.reply = replyText;

        // اگر فیلدی برای تاریخ پاسخ دارید می‌توانید آپدیت کنید، مثلا:
        // review.repliedAt = new Date();

        return await this.tenantReviewRepository.save(review);
    }

    // ----------------------------------------------------------------
    // مدیریت زمان‌های استراحت (Time Off Management)
    // ----------------------------------------------------------------

    /**
     * دریافت لیست تمام زمان‌های استراحت ثبت شده برای تننت جاری
     */
    async getTimeOffBlocks(): Promise<TimeOffBlock[]> {
        const tenantId = this.tenantContext.getTenantId()
        // فعلاً تمام رکوردها را برمی‌گردانیم:
        return this.timeOffRepository.find({
            where: {tenantId},
            order: {date: 'ASC', startTime: 'ASC'}
        });
    }

    /**
     * ثبت یک زمان استراحت جدید
     */
    async addTimeOffBlock(dto: CreateTimeOffDto) {
        const tenantId = this.tenantContext.getTenantId()
        // ۱. تبدیل زمان‌ها به دقیقه برای مقایسه راحت‌تر (مشابه فرانت)
        const startMinutes = this.timeToMinutes(dto.startTime);
        const endMinutes = this.timeToMinutes(dto.endTime);

        // ۲. اعتبارسنجی ساده
        if (startMinutes === null || endMinutes === null) {
            throw new BadRequestException('فرمت ساعت شروع یا پایان نامعتبر است.');
        }
        if (endMinutes <= startMinutes) {
            throw new BadRequestException('ساعت پایان باید بعد از ساعت شروع باشد.');
        }

        // ۳. بررسی تداخل با زمان‌های موجود در همان تاریخ
        const conflicts = await this.timeOffRepository.find({
            where: {date: dto.date}
        });

        const hasConflict = conflicts.some(block => {
            const existingStart = this.timeToMinutes(block.startTime);
            const existingEnd = this.timeToMinutes(block.endTime);

            // اصلاح شده: بررسی اینکه مقادیر نال نباشند
            if (existingStart === null || existingEnd === null) {
                return false;
            }

            // منطق بررسی تداخل: (StartA < EndB) و (EndA > StartB)
            return (startMinutes < existingEnd && endMinutes > existingStart);
        });

        if (hasConflict) {
            throw new BadRequestException('این بازه زمانی با یک زمان استراحت دیگر تداخل دارد.');
        }

        // ۴. ذخیره سازی
        const newBlock = this.timeOffRepository.create({
            tenantId: tenantId,
            date: dto.date,
            startTime: dto.startTime,
            endTime: dto.endTime,
            note: dto.note
        });

        return await this.timeOffRepository.save(newBlock);
    }

    /**
     * حذف یک زمان استراحت
     */
    async deleteTimeOffBlock(id: string) {
        const tenantId = this.tenantContext.getTenantId()
        const block = await this.timeOffRepository.findOne({where: {id, tenantId}});
        if (!block) {
            throw new NotFoundException('زمان استراحت یافت نشد.');
        }
        await this.timeOffRepository.remove(block);
        return {message: 'زمان استراحت با موفقیت حذف شد.'};
    }

    // متد کمکی برای تبدیل زمان HH:mm به دقیقه
    private timeToMinutes(time: string): number | null {
        if (!time) return null;
        const [hours, minutes] = time.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) return null;
        return hours * 60 + minutes;
    }

    //========================= //====================
    /**
     * دریافت آمار ظرفیت
     */
    async getCapacityStats() {
        const tenantId = this.tenantContext.getTenantId();
        return this.clinicCapacityService.getCapacityStats(tenantId);
    }


    /**
     * دریافت تنظیمات ظرفیت
     */
    async getCapacitySettings() {
        const tenantId = this.tenantContext.getTenantId();
        return this.clinicCapacityService.getCapacitySettings(tenantId);
    }

    /**
     * به‌روزرسانی تنظیمات ظرفیت
     */
    async updateCapacitySettings(settings: any) {
        const tenantId = this.tenantContext.getTenantId();
        return this.clinicCapacityService.updateCapacitySettings(tenantId, settings);
    }

    /**
     * تنظیم وضعیت آنلاین
     */
    async setOnlineStatus(isOnline: boolean) {
        const tenantId = this.tenantContext.getTenantId();
        await this.tenantRepository.update(tenantId, {
            isOnline,
            lastActivityAt: new Date()
        });
        return {success: true, isOnline};
    }

    /**
     * دریافت لیست صف انتظار
     */
    async getQueueList(serviceType?: AppointmentType): Promise<AppointmentQueue[]> {
        const tenantId = this.tenantContext.getTenantId();

        const where: any = {
            tenantId,
            status: QueueStatus.WAITING,
        };

        if (serviceType) {
            where.appointmentType = serviceType;
        }

        return this.queueRepository.find({
            where,
            order: {
                position: 'ASC'
            },
            relations: ['appointment.pet.owner'],
            select: {
                appointment: {
                    id: true,
                    pet: {
                        id: true,
                        name: true,
                        owner: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            fullName: true
                        }
                    }
                }
            }
        } as any);
    }

    /**
     * شروع مشاوره برای نفر در صف انتظار
     * این متد رکورد صف را حذف/آپدیت کرده و وضعیت نوبت اصلی را به وضعیت فعال تغییر می‌دهد.
     */
    async startNextInQueue(appointmentId: string) {
        const tenantId = this.tenantContext.getTenantId();

        // 1. پیدا کردن نوبت برای اطمینان از وجود و دریافت نوع آن
        const appointment = await this.appointmentRepository.findOne({
            where: {id: appointmentId},
            relations: ['consultation'],
        });

        if (!appointment) {
            throw new NotFoundException('نوبت مربوطه یافت نشد.');
        }

        // 2. فراخوانی سرویس ظرفیت برای انجام عملیات اصلی (ایجاد مشاوره و مدیریت صف)
        const result = await this.clinicCapacityService.startNextInQueue(
            tenantId,
            appointmentId,
            appointment.type // ارسال نوع نوبت به سرویس ظرفیت
        );

        // اگر عملیات با شکست مواجه شد (مثلاً صف خالی بود)
        if (!result.success) {
            throw new BadRequestException(result.message);
        }
        // 3. پرتاب ایونت برای سیستم‌های Real-time (مثل Socket.io)
        this.eventEmitter.emit('vet.clinic.queue.started', {
            queueEntry: result.queueEntry,
            appointmentId: appointment.id,
            consultationId: result.consultationId,
            doctorId: tenantId,
        });

        // 4. بازگرداندن پاسخ نهایی به کنترلر
        return {
            success: true,
            message: result.message,
            requiresPayment: result.requiresPayment,
            appointment: {
                ...appointment,
                consultationId: result.consultationId, // اطمینان از اینکه ID مشاوره جدید به پاسخ اضافه شود
            },
        };
    }

    /**
     * حذف از صف
     */
    async removeFromQueue(appointmentId: string) {
        const tenantId = this.tenantContext.getTenantId();
        await this.clinicCapacityService.leaveQueue(tenantId, '', appointmentId);
        return {success: true, message: 'از صف حذف شد'};
    }

    // ----------------------------------------------------------------
    // ۵. مدیریت درخواست‌های فوری (Instant Requests)
    // ----------------------------------------------------------------

    /**
     * پذیرش درخواست فوری توسط دکتر
     */
    async acceptInstantRequest(requestId: string) {
        const tenantId = this.tenantContext.getTenantId();
        // بررسی وجود نوبت
        const appointment = await this.appointmentRepository.findOne({
            where: {id: requestId},
            relations: ['consultation', 'order']
        });

        if (!appointment) {
            throw new NotFoundException('درخواست یافت نشد');
        }

        // بررسی تداخل وضعیت (اگر قبلا پردازش شده باشد)
        if (appointment.status === AppointmentStatus.CANCELLED || appointment.status === AppointmentStatus.COMPLETED) {
            throw new BadRequestException('این نوبت قابل پذیرش نیست.');
        }

        try {
            // فراخوانی متد مربوطه در سرویس ظرفیت برای رزرو اسلات و ایجاد مشاوره
            const result = await this.clinicCapacityService.acceptInstantRequest(
                requestId,
                tenantId
            );

            if (!result.success) {
                return {success: false, message: 'خطا در پذیرش درخواست'};
            }

            return {
                success: true,
                message: 'درخواست فوری پذیرفته شد',
                consultationId: result.consultationId,
                nextInQueue: result.nextInQueue
            };

        } catch (error) {
            throw new BadRequestException(error.message || 'خطا در پذیرش درخواست');
        }
    }

    /**
     * رد درخواست فوری توسط دکتر
     */
    async rejectInstantRequest(requestId: string, reason: string) {
        const tenantId = this.tenantContext.getTenantId();

        // بررسی وجود نوبت
        const appointment = await this.appointmentRepository.findOne({
            where: {id: requestId}
        });

        if (!appointment) {
            throw new NotFoundException('درخواست یافت نشد');
        }

        // بررسی تداخل وضعیت
        if (appointment.status === AppointmentStatus.CANCELLED || appointment.status === AppointmentStatus.COMPLETED) {
            throw new BadRequestException('این نوبت قابل رد کردن نیست.');
        }

        try {
            // فراخوانی متد مربوطه در سرویس ظرفیت برای رد و مدیریت صف
            const result = await this.clinicCapacityService.rejectInstantRequest(
                requestId,
                tenantId,
                reason
            );

            // آپدیت نهایی وضعیت نوبت در دیتابیس اصلی (اگر سرویس ظرفیت فقط صف را مدیریت کرده باشد)
            await this.appointmentRepository.update(requestId, {
                status: AppointmentStatus.CANCELLED,
                cancelledReason: reason || 'رد شده توسط دکتر'
            });

            return {
                success: true,
                message: 'درخواست فوری رد شد',
                nextInQueue: result.nextInQueue
            };

        } catch (error) {
            throw new BadRequestException(error.message || 'خطا در رد درخواست');
        }
    }

    async getTotalPaidRevenue(): Promise<number> {
        const tenantId = this.tenantContext.getTenantId();
        if (!tenantId) return 0;

        const result = await this.dataSource
            .getRepository(Payment)
            .createQueryBuilder('payment')
            .select('SUM(payment.amount)', 'total')
            .where('payment.tenantId = :tenantId', {tenantId})
            .andWhere('payment.status = :status', {status: 'PAID'})
            .getRawOne();

        return parseFloat(result?.total || '0');
    }

    /**
     * دریافت گزارش درآمد بر اساس بازه زمانی (روزانه، هفتگی، ماهانه، سه ماه اخیر)
     */
    async getRevenueByPeriod(period: 'daily' | 'weekly' | 'monthly' | 'quarterly'): Promise<any[]> {
        const tenantId = this.tenantContext.getTenantId();
        if (!tenantId) return [];

        // تعیین توابع SQL بر اساس بازه زمانی
        let dateFunction = '';
        let params: any[] = [tenantId]; // پارامترها به صورت آرایه
        let whereClause = 'WHERE "payment"."tenantId" = $1 AND "payment"."status" = $2';

        // اضافه کردن پارامتر وضعیت پرداخت
        params.push('PAID');

        switch (period) {
            case 'daily':
                dateFunction = "DATE(\"payment\".\"createdAt\")";
                break;
            case 'weekly':
                dateFunction = "TO_CHAR(\"payment\".\"createdAt\", 'IYYY-IW')";
                break;
            case 'monthly':
                dateFunction = "TO_CHAR(\"payment\".\"createdAt\", 'YYYY-MM')";
                break;
            case 'quarterly':
                // برای سه ماه اخیر، ابتدا فیلتر زمانی اعمال می‌شود
                const threeMonthsAgo = new Date();
                threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

                // تغییر where clause برای سه ماه اخیر
                whereClause = 'WHERE "payment"."tenantId" = $1 AND "payment"."status" = $2 AND "payment"."createdAt" >= $3';
                params.push(threeMonthsAgo);

                dateFunction = "TO_CHAR(\"payment\".\"createdAt\", 'YYYY-MM')";
                break;
        }

        // نکته مهم: نام جدول را حتماً با کوتیشن دوتایی "" بپوشانید
        // اگر نام جدول در دیتابیس payments است، باید بنویسید "payments"
        // اگر payment است، باید بنویسید "payment"
        // با توجه به خطای شما، احتمالاً نام جدول "payments" است.
        // من فرض می‌کنم نام جدول "payments" است. اگر "payment" است، آن را تغییر دهید.
        const tableName = 'payments';

        const sql = `
            SELECT ${dateFunction}         AS label,
                   SUM("payment"."amount") AS total
            FROM "${tableName}" "payment"
                ${whereClause}
            GROUP BY label
            ORDER BY label ASC
        `;

        // اجرای کوئری مستقیم با پارامترهای پوزیشنال
        const result = await this.dataSource.query(sql, params);

        // تبدیل نتیجه به فرمت آرایه اشیاء
        return result.map((item: any) => ({
            label: item.label,
            total: parseFloat(item.total || '0')
        }));
    }

    private async sendNotificationAndSms(
        manager: EntityManager,
        targetUserId: string,
        title: string,
        message: string,
        smsText: string,
        panelType: string
    ) {
        await this.notifService.create({
            userId: targetUserId,
            type: NotificationType.IN_APP,
            title: title,
            message: message,
            icon: 'heartbeat', // آیکون مرتبط با درمان
            color: 'info',
            statusLabel: 'success',
            panelType: panelType
        });

        const user = await manager.findOne(User, {where: {id: targetUserId}});
        if (user instanceof User && user.phoneNumber) {
            this.smsQueue.add('handle-send-sms', {
                phoneNumber: user.phoneNumber,
                message: smsText
            }).catch(err => {
                console.error('Failed to add SMS job to queue:', err);
            });
        }
    }
}