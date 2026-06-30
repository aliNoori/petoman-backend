import {BadRequestException, Injectable, Logger, NotFoundException} from "@nestjs/common";
import {InjectRepository} from "@nestjs/typeorm";
import {DataSource, EntityManager, In, LessThan, MoreThan, Repository,} from "typeorm";
import {InjectQueue} from "@nestjs/bull";
import {Queue} from "bull";
import {Cron} from "@nestjs/schedule";
import {Tenant} from "../../core/entities/tenant.entity";
import {Appointment, AppointmentStatus, AppointmentType,} from "./entities/appointment.entity";
import {AppointmentQueue, QueueStatus} from "./appointment/entities/appointment-queue.entity";
import {Consultation, ConsultationStatus} from "../../socket/consultation/consultation.entity";
import {NotificationType} from "../../shared/notification/notification.entity";
import {toGregorian} from "jalaali-js";
import {PaymentStatus} from "../../shared/gateways/payments/payment-status-machine.enum";
import {Wallet, WalletType} from "../../shared/wallet/wallet.entity";
import {WalletTransaction, WalletTransactionType} from "../../shared/wallet/wallet-transaction.entity";
import {OrderStatus} from "../../shared/order/order-status.enum";
import {Payment} from "../../shared/gateways/payments/payment.entity";
import {Order} from "../../shared/order/order.entity";

/*
 * ═══════════════════════════════════════════════════════════════
 *                 ClinicCapacityService
 * ═══════════════════════════════════════════════════════════════
 * مدیریت ظرفیت، صف، و رزرو کلینیک دامپزشکی
 * از Entity: AppointmentQueue استفاده می‌کند
 */
@Injectable()
export class ClinicCapacityService {
    private readonly logger = new Logger(ClinicCapacityService.name);

    // ─────────────────────────────────────────
    // 🔷 Constants
    // ─────────────────────────────────────────
    private readonly TEMPORARY_RESERVATION_MINUTES = 10;
    private readonly MAX_QUEUE_WAIT_MINUTES = 60;
    private readonly MAX_QUEUE_LENGTH = 20;
    private readonly DEFAULT_CONSULTATION_DURATION_MINUTES = 15;
    private readonly SLOT_DURATION_MINUTES = 30;

    constructor(
        private readonly dataSource: DataSource,
        @InjectRepository(Tenant) private readonly tenantRepository: Repository<Tenant>,
        @InjectRepository(Appointment) private readonly appointmentRepository: Repository<Appointment>,
        @InjectRepository(Consultation) private readonly consultationRepository: Repository<Consultation>,
        @InjectRepository(AppointmentQueue) private readonly queueRepository: Repository<AppointmentQueue>,
        @InjectQueue("notifications") private readonly notificationQueue: Queue,
    ) {
    }

    // =====================================================
    // 🔷 متدهای کمکی (Helper Methods)
    // =====================================================

    /**
     * دریافت اطلاعات دکتر همراه با ظرفیت‌ها
     */
    public async getVetWithCapacity(vetId: string): Promise<Tenant> {
        if (!vetId) {
            throw new BadRequestException("شناسه دامپزشک الزامی است");
        }

        const vet = await this.tenantRepository.findOne({
            where: {id: vetId},
        });

        if (!vet) {
            throw new NotFoundException("دامپزشک/کلینیک یافت نشد");
        }

        return vet;
    }

    /**
     * تعیین حداکثر ظرفیت بر اساس نوع سرویس
     */
    getCapacityForService(vet: Tenant, serviceType: AppointmentType): number {
        switch (serviceType) {
            case AppointmentType.ONLINE_CHAT:
                return vet.chatCapacity ?? 3;
            case AppointmentType.PHONE_INSTANT:
                return vet.phoneInstantCapacity ?? 2;
            case AppointmentType.PHONE_SCHEDULED:
                return vet.phoneScheduledCapacity ?? 5;
            default:
                return 0;
        }
    }

    /**
     * تعیین مدت زمان سرویس بر اساس نوع
     */
    getDurationForService(vet: Tenant, serviceType: AppointmentType): number {
        switch (serviceType) {
            case AppointmentType.ONLINE_CHAT:
                return vet.chatDuration ?? this.DEFAULT_CONSULTATION_DURATION_MINUTES;
            case AppointmentType.PHONE_INSTANT:
                return vet.phoneInstantDuration ?? 10;
            case AppointmentType.PHONE_SCHEDULED:
                return vet.phoneScheduledDuration ?? 15;
            default:
                return this.DEFAULT_CONSULTATION_DURATION_MINUTES;
        }
    }

    /**
     * بررسی فعال بودن سرویس
     */
    isServiceEnabled(vet: Tenant, serviceType: AppointmentType): boolean {
        switch (serviceType) {
            case AppointmentType.ONLINE_CHAT:
                return vet.chatEnabled ?? true;
            case AppointmentType.PHONE_INSTANT:
                return vet.phoneInstantEnabled ?? true;
            case AppointmentType.PHONE_SCHEDULED:
                return vet.phoneScheduledEnabled ?? true;
            default:
                return true;
        }
    }

    /**
     * بررسی آنلاین بودن دکتر
     */
    isVetOnline(vet: Tenant): boolean {
        if (vet.doNotDisturb) {
            return false;
        }
        return vet.isOnline ?? true;
    }

    /**
     * شمارش مشاوره‌های فعال فعلی
     */
    private async countActiveAppointments(
        vetId: string,
        serviceType: AppointmentType,
    ): Promise<number> {
        return this.appointmentRepository.count({
            where: {
                tenantId: vetId,
                type: serviceType,
                //isActive: true,//TODO:next check this option
                status: In([AppointmentStatus.IN_PROGRESS, AppointmentStatus.IN_CHAT, AppointmentStatus.PENDING]),
            },
        });
    }

    /**
     * شمارش با Lock (برای جلوگیری از Race Condition)
     */
    private async countActiveAppointmentsWithLock(
        manager: EntityManager,
        vetId: string,
        serviceType: AppointmentType,
    ): Promise<number> {
        const appointments = await manager
            .createQueryBuilder(Appointment, "apt")
            .setLock("pessimistic_write")
            .where("apt.tenantId = :vetId", {vetId})
            .andWhere("apt.type = :serviceType", {serviceType})
            .andWhere("apt.isActive = :isActive", {isActive: true})
            .andWhere("apt.status IN (:...statuses)", {
                statuses: [AppointmentStatus.IN_PROGRESS, AppointmentStatus.IN_CHAT],
            })
            .getMany();

        return appointments.length;
    }

    /**
     * دریافت آخرین position در صف
     */
    private async getLastQueuePosition(
        manager: EntityManager,
        vetId: string,
        appointmentType: AppointmentType,
    ): Promise<number> {
        const lastInQueue = await manager
            .createQueryBuilder(AppointmentQueue, "queue")
            .setLock("pessimistic_write")
            .where("queue.tenantId = :vetId", {vetId})
            .andWhere("queue.appointmentType = :appointmentType", {appointmentType})
            .andWhere("queue.status = :status", {status: QueueStatus.WAITING})
            .orderBy("queue.position", "DESC")
            .getOne();

        return lastInQueue?.position || 0;
    }

    /**
     * محاسبه زمان تخمینی انتظار
     */
    async calculateEstimatedWait(vetId: string, appointmentType: AppointmentType): Promise<number> {
        const vet = await this.getVetWithCapacity(vetId);
        const duration = this.getDurationForService(vet, appointmentType);
        const activeCount = await this.countActiveAppointments(vetId, appointmentType);
        const queueCount = await this.queueRepository.count({
            where: {tenantId: vetId, appointmentType, status: QueueStatus.WAITING},
        });
        return (activeCount + queueCount) * duration;
    }

    // =====================================================
    // 🔷 متدهای مدیریت صف
    // =====================================================

    /**
     * ایجاد رکورد صف
     */
    private async createQueueEntry(
        manager: EntityManager,
        data: {
            tenantId: string;
            userId: string;
            orderId: string;
            appointmentType: AppointmentType;
            position: number;
            patientName?: string;
            patientPhone?: string;
            reason?: string;
            preferredTime?: Date;
            estimatedWaitMinutes: number;
        },
    ): Promise<AppointmentQueue> {
        const queueEntry = manager.create(AppointmentQueue, {
            tenantId: data.tenantId,
            userId: data.userId,
            orderId: data.orderId,
            appointmentType: data.appointmentType,
            position: data.position,
            patientName: data.patientName,
            patientPhone: data.patientPhone,
            reason: data.reason,
            preferredTime: data.preferredTime,
            status: QueueStatus.WAITING,
            estimatedWaitMinutes: data.estimatedWaitMinutes,
        });

        return manager.save(queueEntry);
    }

    /**
     * دریافت نفر بعدی از صف
     */
    private async getNextFromQueue(
        manager: EntityManager,
        vetId: string,
        appointmentId:string,
        appointmentType: AppointmentType,
    ): Promise<AppointmentQueue | null> {
        const nextInQueue = await manager.findOne(AppointmentQueue, {
            where: {
                tenantId: vetId,
                appointmentId,
                appointmentType,
                status: QueueStatus.WAITING,
            },
            relations:['order','appointment']
            /*order: {position: "ASC"},*/
        } as any);

        if (nextInQueue) {
            nextInQueue.status = QueueStatus.IN_PROGRESS;
            nextInQueue.startedAt = new Date();
            nextInQueue.actualWaitMinutes = nextInQueue.calculateActualWait();
            await manager.save(nextInQueue);

            await manager.update(
                Appointment,
                {orderId: nextInQueue.orderId},
                {
                    status: AppointmentStatus.IN_PROGRESS,
                    yourTurn: true,
                    queueNumber: nextInQueue.position,
                },
            );
        }


        if (nextInQueue instanceof AppointmentQueue) {
            await manager.update(
                AppointmentQueue,
                {
                    tenantId: vetId,
                    appointmentType: appointmentType,
                    status: QueueStatus.WAITING, // فقط کسانی که هنوز در صف انتظار هستند
                    position: MoreThan(nextInQueue.position), // فقط کسانی که پوزیشنشان از نفر اول بیشتر است
                },
                {
                    position: () => "position - 1" // کاهش یک واحدی پوزیشن
                }
            );
        }

        return nextInQueue;
    }

    /**
     * اطلاع‌رسانی به نفر بعدی در صف
     */
    private async notifyNextInQueue(queueEntry: AppointmentQueue): Promise<void> {
        if (queueEntry.notifiedUser) return;

        try {
            await this.notificationQueue.add("handle-notification", {
                userId: queueEntry.userId,
                type: NotificationType.IN_APP,
                title: "نوبت شما رسید! 🎉",
                message: "مشاوره شما آماده است. لطفاً وارد صفحه مشاوره شوید.",
                icon: "heartbeat",
                color: "success",
                panelType: "VET-CLINIC-PHARMACY",
                data: {
                    orderId: queueEntry.orderId,
                    queueId: queueEntry.id,
                },
            });

            // به‌روزرسانی وضعیت اطلاع‌رسانی
            queueEntry.notifiedUser = true;
            queueEntry.notifiedAt = new Date();
            await this.queueRepository.save(queueEntry);
        } catch (error) {
            this.logger.error(`خطا در اطلاع‌رسانی به نفر بعدی در صف: ${error.message}`, error.stack);
        }
    }

    // =====================================================
    // 🔷 متدهای مدیریت تداخل و رزرو
    // =====================================================

    /**
     * تبدیل تاریخ شمسی به میلادی
     */
    private convertJalaliToGregorian(dateStr: string, timeStr: string): Date {
        if (!dateStr || !timeStr) {
            throw new BadRequestException("تاریخ و زمان رزرو الزامی است");
        }

        const [jYear, jMonth, jDay] = dateStr.split("/").map(Number);
        const [hours, minutes] = timeStr.split(":").map(Number);

        if (isNaN(jYear) || isNaN(jMonth) || isNaN(jDay)) {
            throw new BadRequestException("فرمت تاریخ نامعتبر است. فرمت صحیح: YYYY/MM/DD");
        }

        if (isNaN(hours) || isNaN(minutes)) {
            throw new BadRequestException("فرمت زمان نامعتبر است. فرمت صحیح: HH:MM");
        }

        const {gy, gm, gd} = toGregorian(jYear, jMonth, jDay);
        return new Date(gy, gm - 1, gd, hours, minutes, 0);
    }

    /**
     * بررسی تداخل نوبت‌ها
     */
    async checkSlotConflict(
        tenantId: string,
        targetDate: Date,
        targetTime?: string,
        excludeAppointmentId?: string,
    ): Promise<{ conflict: boolean; conflictingAppointment?: Appointment }> {
        const slotStart = new Date(targetDate);
        let hours = 0;
        let minutes = 0;
        if (targetTime) {
            const timeParts = targetTime.split(':').map(Number);
            hours = timeParts[0] || 0;
            minutes = timeParts[1] || 0;
        }

        slotStart.setHours(hours, minutes, 0, 0);
        const slotEnd = new Date(slotStart.getTime() + this.SLOT_DURATION_MINUTES * 60 * 1000);

        const queryBuilder = this.appointmentRepository
            .createQueryBuilder("apt")
            .where("apt.tenantId = :tenantId", {tenantId})
            .andWhere("apt.appointmentDate >= :slotStart", {slotStart})
            .andWhere("apt.appointmentDate < :slotEnd", {slotEnd})
            .andWhere("apt.status NOT IN (:...excludedStatuses)", {
                excludedStatuses: [
                    AppointmentStatus.CANCELLED,
                    AppointmentStatus.REJECTED,
                    AppointmentStatus.NO_SHOW,
                    AppointmentStatus.EXPIRED,
                    AppointmentStatus.TEMP_RESERVED,
                ],
            });

        if (excludeAppointmentId) {
            queryBuilder.andWhere("apt.id != :excludeAppointmentId", {excludeAppointmentId});
        }

        const conflictingAppointment = await queryBuilder.getOne();

        return {
            conflict: !!conflictingAppointment,
            conflictingAppointment: conflictingAppointment || undefined,
        };
    }

    /**
     * تأیید رزرو موقت و تبدیل به نوبت نهایی
     */
    async confirmSlotReservation(
        reservationId: string,
        orderId: string,
        userId: string,
    ): Promise<{ success: boolean; appointment?: Appointment | null; error?: string }> {
        if (!reservationId || !orderId || !userId) {
            return {success: false, error: "پارامترهای الزامی ارسال نشده است"};
        }

        const reservation = await this.appointmentRepository.findOne({
            where: {id: reservationId},
        });

        if (!reservation) {
            return {success: false, error: "رزرو یافت نشد"};
        }

        if (reservation.status !== AppointmentStatus.TEMP_RESERVED) {
            return {success: false, error: "رزرو منقضی یا قبلاً استفاده شده است"};
        }

        if (reservation.userId !== userId) {
            return {success: false, error: "این رزرو متعلق به شما نیست"};
        }

        // ✅ رفع خطا: بررسی وجود appointmentDate
        if (!reservation.appointmentDate) {
            return {success: false, error: "تاریخ رزرو تنظیم نشده است"};
        }

        const appointmentDate = new Date(reservation.appointmentDate);
        const timeStr = `${appointmentDate.getHours()}:${appointmentDate
            .getMinutes()
            .toString()
            .padStart(2, "0")}`;

        const conflictCheck = await this.checkSlotConflict(
            reservation.tenantId,
            appointmentDate,
            timeStr,
            reservationId,
        );

        if (conflictCheck.conflict) {
            await this.appointmentRepository.update(
                {id: reservationId},
                {status: AppointmentStatus.EXPIRED},
            );
            return {
                success: false,
                error: "متأسفانه این زمان توسط کاربر دیگری رزرو شده است",
            };
        }

        reservation.orderId = orderId;
        reservation.status = AppointmentStatus.CONFIRMED;
        reservation.startedAt = new Date();
        await this.appointmentRepository.save(reservation);

        await this.appointmentRepository.update(
            {orderId},
            {
                appointmentDate: appointmentDate,
                status: AppointmentStatus.CONFIRMED,
            },
        );

        const appointment = await this.appointmentRepository.findOne({where: {orderId}});

        // ✅ رفع خطا: return type match
        return {success: true, appointment: appointment ?? undefined};
    }

    /**
     * لغو رزرو موقت
     */
    async cancelTemporaryReservation(reservationId: string, userId: string): Promise<{ success: boolean }> {
        const reservation = await this.appointmentRepository.findOne({
            where: {id: reservationId},
        });

        if (!reservation || reservation.status !== AppointmentStatus.TEMP_RESERVED) {
            return {success: false};
        }

        if (reservation.userId !== userId) {
            return {success: false};
        }

        await this.appointmentRepository.update(
            {id: reservationId},
            {status: AppointmentStatus.CANCELLED},
        );

        return {success: true};
    }

    /**
     * پاک‌سازی رزروهای منقضی شده (Cron Job)
     */
    @Cron("*/5 * * * *")
    async cleanupExpiredReservations(): Promise<void> {
        const expirationThreshold = new Date(
            Date.now() - this.TEMPORARY_RESERVATION_MINUTES * 60 * 1000,
        );

        const expiredReservations = await this.appointmentRepository.find({
            where: {
                status: AppointmentStatus.TEMP_RESERVED,
                startedAt: LessThan(expirationThreshold),
            },
        });

        for (const res of expiredReservations) {
            await this.appointmentRepository.update(
                {id: res.id},
                {status: AppointmentStatus.EXPIRED},
            );
            this.logger.log(`🧹 رزرو موقت ${res.id} منقضی شد و آزاد شد`);
        }
    }

    /**
     * پاک‌سازی دستی رزرو منقضی
     */
    async cleanupTempReservation(data: {
        appointmentId: string;
        tenantId: string;
        slotDate: string;
        time: string;
    }): Promise<void> {
        const reservation = await this.appointmentRepository.findOne({
            where: {id: data.appointmentId},
        });

        if (reservation && reservation.status === AppointmentStatus.TEMP_RESERVED) {
            const existingAppointment = await this.appointmentRepository.findOne({
                where: {
                    tenantId: data.tenantId,
                    appointmentDate: new Date(data.slotDate),
                    status: In([
                        AppointmentStatus.CONFIRMED,
                        AppointmentStatus.REQUEST_SENT,
                        AppointmentStatus.PENDING,
                        AppointmentStatus.IN_PROGRESS,
                    ]),
                },
            });

            if (!existingAppointment) {
                await this.appointmentRepository.update(
                    {id: data.appointmentId},
                    {status: AppointmentStatus.EXPIRED},
                );
                this.logger.log(`🧹 رزرو موقت ${data.appointmentId} منقضی شد`);
            }
        }
    }

    // =====================================================
    // 🔷 متدهای اصلی (Public Methods)
    // =====================================================

    /**
     * بررسی می‌کند آیا دکتر ظرفیت برای سرویس مورد نظر را دارد
     */
    async checkAvailability(
        vetId: string,
        appointmentType: AppointmentType,
    ): Promise<{
        available: boolean;
        activeCount: number;
        maxCapacity: number;
        queuePosition?: number;
        isOnline: boolean;
        serviceEnabled: boolean;
        estimatedWaitMinutes?: number;
    }> {
        if (!vetId) {
            return {
                available: false,
                activeCount: 0,
                maxCapacity: 0,
                isOnline: false,
                serviceEnabled: false,
                estimatedWaitMinutes: 0,
            };
        }

        const vet = await this.getVetWithCapacity(vetId);

        if (!this.isVetOnline(vet)) {
            return {
                available: false,
                activeCount: 0,
                maxCapacity: 0,
                isOnline: false,
                serviceEnabled: this.isServiceEnabled(vet, appointmentType),
                estimatedWaitMinutes: 0,
            };
        }

        if (!this.isServiceEnabled(vet, appointmentType)) {
            return {
                available: false,
                activeCount: 0,
                maxCapacity: 0,
                isOnline: true,
                serviceEnabled: false,
                estimatedWaitMinutes: 0,
            };
        }

        const capacity = this.getCapacityForService(vet, appointmentType);

        if (capacity === 0) {
            return {
                available: true,
                activeCount: 0,
                maxCapacity: 0,
                isOnline: true,
                serviceEnabled: true,
                estimatedWaitMinutes: 0,
            };
        }

        const activeAppointments = await this.countActiveAppointments(vetId, appointmentType);
        const queueCount = await this.queueRepository.count({
            where: {tenantId: vetId, appointmentType, status: QueueStatus.WAITING},
        });

        if (activeAppointments < capacity) {
            return {
                available: true,
                activeCount: activeAppointments,
                maxCapacity: capacity,
                isOnline: true,
                serviceEnabled: true,
                estimatedWaitMinutes: 0,
            };
        } else {
            const estimatedWait = await this.calculateEstimatedWait(vetId, appointmentType);
            return {
                available: false,
                activeCount: activeAppointments,
                maxCapacity: capacity,
                queuePosition: activeAppointments + queueCount + 1,
                isOnline: true,
                serviceEnabled: true,
                estimatedWaitMinutes: estimatedWait,
            };
        }
    }

    /**
     * رزرو اسلات و قفل کردن برای دکتر
     */
    async reserveSlot(
        vetId: string,
        appointmentType: AppointmentType,
        userId: string,
        orderId: string,
        extraData?: {
            patientName?: string;
            patientPhone?: string;
            reason?: string;
            preferredTime?: Date;
        },
    ): Promise<{
        success: boolean;
        slotId?: string;
        waitTime?: number;
        position?: number;
        message: string;
    }> {
        return this.dataSource.transaction(async (manager) => {
            const vet = await this.getVetWithCapacity(vetId);
            const capacity = this.getCapacityForService(vet, appointmentType);

            if (capacity === 0) {
                return {
                    success: true,
                    message: "رزرو بدون محدودیت ظرفیت انجام شد",
                };
            }

            const activeCount = await this.countActiveAppointmentsWithLock(manager, vetId, appointmentType);

            if (activeCount >= capacity) {
                const lastPosition = await this.getLastQueuePosition(manager, vetId, appointmentType);
                const newPosition = lastPosition + 1;
                const estimatedWait = await this.calculateEstimatedWait(vetId, appointmentType);

                await this.createQueueEntry(manager, {
                    tenantId: vetId,
                    userId,
                    orderId,
                    appointmentType,
                    position: newPosition,
                    patientName: extraData?.patientName,
                    patientPhone: extraData?.patientPhone,
                    reason: extraData?.reason,
                    preferredTime: extraData?.preferredTime,
                    estimatedWaitMinutes: estimatedWait,
                });

                await manager.update(
                    Appointment,
                    {orderId},
                    {
                        queueNumber: newPosition,
                        status: AppointmentStatus.QUEUED,
                        joinedQueueAt: new Date(),
                        estimatedWaitMinutes: estimatedWait,
                    },
                );

                return {
                    success: false,
                    waitTime: estimatedWait,
                    position: newPosition,
                    message: `شما در صف انتظار هستید. موقعیت: ${newPosition}`,
                };
            }

            const slotId = `SLOT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            await manager.update(
                Appointment,
                {orderId},
                {
                    isActive: true,
                    slotId,
                    queueNumber: 1,
                    status: AppointmentStatus.IN_PROGRESS,
                    startedAt: new Date(),
                },
            );

            return {success: true, slotId, message: "اسلات با موفقیت رزرو شد"};
        });
    }

    /**
     * آزادسازی اسلات بعد از پایان مشاوره
     */
    async releaseSlot(
        vetId: string,
        appointmentType: AppointmentType,
        appointmentId: string,
    ): Promise<void> {
        await this.dataSource.transaction(async (manager) => {
            await manager.update(
                Appointment,
                {id: appointmentId},
                {
                    isActive: false,
                    status: AppointmentStatus.COMPLETED,
                    endedAt: new Date(),
                },
            );

            const nextInQueue = await this.getNextFromQueue(manager, vetId,appointmentId, appointmentType);

            if (nextInQueue) {
                await this.notifyNextInQueue(nextInQueue);
            }
        });
    }

    /**
     * مدیریت timeout
     */
    async handleTimeout(appointmentId: string): Promise<void> {
        const appointment = await this.appointmentRepository.findOne({
            where: {id: appointmentId},
            relations: ["order", "tenant"],
        });

        if (!appointment) {
            this.logger.warn(`Appointment ${appointmentId} یافت نشد`);
            return;
        }

        if (appointment.isActive || appointment.status === AppointmentStatus.QUEUED) {
            if (appointment.status === AppointmentStatus.QUEUED) {
                await this.queueRepository.update(
                    {orderId: appointment.orderId},
                    {status: QueueStatus.EXPIRED, resolvedAt: new Date()},
                );
            }

            await this.releaseSlot(appointment.tenantId, appointment.type, appointmentId);

            appointment.status = AppointmentStatus.EXPIRED;
            appointment.isActive = false;
            await this.appointmentRepository.save(appointment);

            this.logger.log(`Appointment ${appointmentId} منقضی شد (timeout)`);
        }
    }

    /**
     * دریافت وضعیت صف برای یک کاربر خاص
     */
    async getUserQueueStatus(
        vetId: string,
        userId: string,
        appointmentType: AppointmentType,
    ): Promise<{
        inQueue: boolean;
        position?: number;
        estimatedWait?: number;
        yourTurn?: boolean;
        queueInfo?: AppointmentQueue;
    }> {
        const queueEntry = await this.queueRepository.findOne({
            where: {
                tenantId: vetId,
                userId,
                appointmentType,
                status: In([QueueStatus.WAITING, QueueStatus.IN_PROGRESS]),
            },
        });

        if (!queueEntry) {
            const activeAppointment = await this.appointmentRepository.findOne({
                where: {
                    tenantId: vetId,
                    userId,
                    type: appointmentType,
                    isActive: true,
                },
            });

            return {
                inQueue: false,
                yourTurn: !!activeAppointment,
            };
        }

        return {
            inQueue: true,
            position: queueEntry.position,
            estimatedWait: queueEntry.estimatedWaitMinutes,
            yourTurn: queueEntry.status === QueueStatus.IN_PROGRESS,
            queueInfo: queueEntry,
        };
    }

    /**
     * لغو عضویت از صف
     */
    async leaveQueue(vetId: string, userId: string, orderId: string): Promise<{ success: boolean }> {
        const queueEntry = await this.queueRepository.findOne({
            where: {orderId, tenantId: vetId},
            relations: ['appointment.consultation']
        });

        if (queueEntry) {
            queueEntry.status = QueueStatus.CANCELLED;
            queueEntry.appointment.status = AppointmentStatus.CANCELLED
            queueEntry.resolvedAt = new Date();
            if (queueEntry.appointment.consultation) {
                queueEntry.appointment.consultation.status = ConsultationStatus.INACTIVE
                await this.consultationRepository.save(queueEntry.appointment.consultation)
            }
            await this.appointmentRepository.save(queueEntry.appointment)
            await this.queueRepository.save(queueEntry);
        }

        /*await this.appointmentRepository.update(
            { orderId },
            { status: AppointmentStatus.CANCELLED },
        );*/

        this.logger.log(`کاربر ${userId} از صف خارج شد (orderId: ${orderId})`);

        return {success: true};
    }

    /**
     * دریافت تنظیمات ظرفیت تنت
     */
    async getCapacitySettings(vetId: string) {
        const vet = await this.getVetWithCapacity(vetId);

        return {
            isOnline: vet.isOnline ?? true,
            doNotDisturb: vet.doNotDisturb ?? false,
            chatEnabled: vet.chatEnabled ?? true,
            chatCapacity: vet.chatCapacity ?? 3,
            chatDuration: vet.chatDuration ?? 15,
            phoneInstantEnabled: vet.phoneInstantEnabled ?? true,
            phoneInstantCapacity: vet.phoneInstantCapacity ?? 2,
            phoneInstantDuration: vet.phoneInstantDuration ?? 10,
            phoneScheduledEnabled: vet.phoneScheduledEnabled ?? true,
            phoneScheduledCapacity: vet.phoneScheduledCapacity ?? 5,
            phoneScheduledDuration: vet.phoneScheduledDuration ?? 15,
            maxQueueLength: this.MAX_QUEUE_LENGTH,
            maxQueueWaitTime: this.MAX_QUEUE_WAIT_MINUTES,
            defaultConsultationDuration: this.DEFAULT_CONSULTATION_DURATION_MINUTES,
        };
    }

    /** _به‌روزرسانی تنظیمات ظرفیت_ */
    async updateCapacitySettings(
        vetId: string,
        settings: {
            chatCapacity?: number;
            phoneInstantCapacity?: number;
            phoneScheduledCapacity?: number;
            chatEnabled?: boolean;
            phoneInstantEnabled?: boolean;
            phoneScheduledEnabled?: boolean;
            defaultConsultationDuration?: number;
            maxQueueWaitTime?: number;
            maxQueueLength?: number;
            doNotDisturb?: boolean;
        },
    ): Promise<Tenant> {
        const vet = await this.getVetWithCapacity(vetId);

        // 1. به‌روزرسانی فیلدهای ساده (Scalar Fields)
        if (settings.chatCapacity !== undefined) vet.chatCapacity = settings.chatCapacity;
        if (settings.phoneInstantCapacity !== undefined) vet.phoneInstantCapacity = settings.phoneInstantCapacity;
        if (settings.phoneScheduledCapacity !== undefined) vet.phoneScheduledCapacity = settings.phoneScheduledCapacity;
        if (settings.chatEnabled !== undefined) vet.chatEnabled = settings.chatEnabled;
        if (settings.phoneInstantEnabled !== undefined) vet.phoneInstantEnabled = settings.phoneInstantEnabled;
        if (settings.phoneScheduledEnabled !== undefined) vet.phoneScheduledEnabled = settings.phoneScheduledEnabled;
        if (settings.defaultConsultationDuration !== undefined) vet.defaultConsultationDuration = settings.defaultConsultationDuration;
        if (settings.maxQueueWaitTime !== undefined) vet.maxQueueWaitTime = settings.maxQueueWaitTime;
        if (settings.maxQueueLength !== undefined) vet.maxQueueLength = settings.maxQueueLength;
        if (settings.doNotDisturb !== undefined) vet.doNotDisturb = settings.doNotDisturb;

        // کپی از وضعیت فعلی برای حفظ داده‌های قبلی (اگر وجود دارند)
        const currentCapacitySettings = vet.capacitySettings || {};

        // تعریف ساختار مورد انتظار برای جلوگیری از خطاهای نوع
        interface CapacityConfig {
            enabled?: boolean;
            maxConcurrent?: number;
            maxQueue?: number;
            autoAccept?: boolean;
            estimatedDuration?: number;
            maxRingTime?: number;
        }

        const newChatSettings: CapacityConfig = {};
        const newInstantSettings: CapacityConfig = {};
        const newScheduledSettings: CapacityConfig = {};

        // پردازش تنظیمات Chat
        if (settings.chatCapacity !== undefined) newChatSettings.maxConcurrent = settings.chatCapacity;
        if (settings.chatEnabled !== undefined) newChatSettings.enabled = settings.chatEnabled;
        if (settings.defaultConsultationDuration !== undefined) newChatSettings.estimatedDuration = settings.defaultConsultationDuration;

        // پردازش تنظیمات Phone Instant
        if (settings.phoneInstantCapacity !== undefined) newInstantSettings.maxConcurrent = settings.phoneInstantCapacity;
        if (settings.phoneInstantEnabled !== undefined) newInstantSettings.enabled = settings.phoneInstantEnabled;

        // پردازش تنظیمات Phone Scheduled
        if (settings.phoneScheduledCapacity !== undefined) newScheduledSettings.maxConcurrent = settings.phoneScheduledCapacity;
        if (settings.phoneScheduledEnabled !== undefined) newScheduledSettings.enabled = settings.phoneScheduledEnabled;

        // ادغام تنظیمات جدید با تنظیمات قدیمی
        const updatedCapacitySettings: any = {...currentCapacitySettings};

        if (Object.keys(newChatSettings).length > 0) {
            updatedCapacitySettings.chat = {
                ...currentCapacitySettings.chat,
                ...newChatSettings
            };
        }

        if (Object.keys(newInstantSettings).length > 0) {
            updatedCapacitySettings.phoneInstant = {
                ...currentCapacitySettings.phoneInstant,
                ...newInstantSettings
            };
        }

        if (Object.keys(newScheduledSettings).length > 0) {
            updatedCapacitySettings.phoneScheduled = {
                ...currentCapacitySettings.phoneScheduled,
                ...newScheduledSettings
            };
        }

        // اختصاص آبجکت جدید به وی
        vet.capacitySettings = updatedCapacitySettings;

        return this.tenantRepository.save(vet);
    }

    /**
     * دریافت آمار ظرفیت (برای داشبورد)
     */
    async getCapacityStats(vetId: string): Promise<{
        chat: { active: number; max: number; queue: number };
        phoneInstant: { active: number; max: number; queue: number };
        phoneScheduled: { active: number; max: number; queue: number };
    }> {
        const vet = await this.getVetWithCapacity(vetId);

        const [chatActive, chatQueue] = await Promise.all([
            this.countActiveAppointments(vetId, AppointmentType.ONLINE_CHAT),
            this.queueRepository.count({
                where: {
                    tenantId: vetId,
                    appointmentType: AppointmentType.ONLINE_CHAT,
                    status: QueueStatus.WAITING,
                },
            }),
        ]);

        const [phoneInstantActive, phoneInstantQueue] = await Promise.all([
            this.countActiveAppointments(vetId, AppointmentType.PHONE_INSTANT),
            this.queueRepository.count({
                where: {
                    tenantId: vetId,
                    appointmentType: AppointmentType.PHONE_INSTANT,
                    status: QueueStatus.WAITING,
                },
            }),
        ]);

        const [phoneScheduledActive, phoneScheduledQueue] = await Promise.all([
            this.countActiveAppointments(vetId, AppointmentType.PHONE_SCHEDULED),
            this.queueRepository.count({
                where: {
                    tenantId: vetId,
                    appointmentType: AppointmentType.PHONE_SCHEDULED,
                    status: QueueStatus.WAITING,
                },
            }),
        ]);

        return {
            chat: {
                active: chatActive,
                max: vet.chatCapacity || 1,
                queue: chatQueue,
            },
            phoneInstant: {
                active: phoneInstantActive,
                max: vet.phoneInstantCapacity || 1,
                queue: phoneInstantQueue,
            },
            phoneScheduled: {
                active: phoneScheduledActive,
                max: vet.phoneScheduledCapacity || 1,
                queue: phoneScheduledQueue,
            },
        };
    }

    /**
     * متد داخلی برای اضافه کردن به صف
     */
    async addToQueueInternal(
        vetId: string,
        appointmentType: AppointmentType,
        userId: string,
        orderId: string,
        extraData?: {
            patientName?: string;
            patientPhone?: string;
            reason?: string;
            preferredTime?: Date;
        },
    ): Promise<{
        position: number;
        estimatedWaitMinutes: number;
        queueId: string;
    }> {
        return this.dataSource.transaction(async (manager) => {
            const lastPosition = await this.getLastQueuePosition(manager, vetId, appointmentType);
            const newPosition = lastPosition + 1;
            const estimatedWait = await this.calculateEstimatedWait(vetId, appointmentType);

            const queueEntry = await this.createQueueEntry(manager, {
                tenantId: vetId,
                userId,
                orderId,
                appointmentType,
                position: newPosition,
                patientName: extraData?.patientName,
                patientPhone: extraData?.patientPhone,
                reason: extraData?.reason,
                preferredTime: extraData?.preferredTime,
                estimatedWaitMinutes: estimatedWait,
            });

            await manager.update(
                Appointment,
                {orderId},
                {
                    queueNumber: newPosition,
                    status: AppointmentStatus.QUEUED,
                    joinedQueueAt: new Date(),
                    estimatedWaitMinutes: estimatedWait,
                },
            );

            // اطلاع‌رسانی به کاربر
            try {
                await this.notificationQueue.add("handle-notification", {
                    userId,
                    type: NotificationType.IN_APP,
                    title: "ثبت در صف انتظار ✅",
                    message: `شما در صف مشاوره قرار گرفتید. موقعیت: ${newPosition}`,
                    icon: "access_time",
                    color: "warning",
                    panelType: "VET-CLINIC-PHARMACY",
                });
            } catch (error) {
                this.logger.error(`خطا در ارسال نوتیفیکیشن: ${error.message}`, error.stack);
            }

            return {
                position: newPosition,
                estimatedWaitMinutes: estimatedWait,
                queueId: queueEntry.id,
            };
        });
    }

    /**
     * پذیرش درخواست فوری توسط دکتر
     */
    async acceptInstantRequest(
        requestId: string,
        doctorId: string,
    ): Promise<{
        success: boolean;
        userId: string;
        consultationId?: string;
        nextInQueue?: AppointmentQueue;
    }> {
        const appointment = await this.appointmentRepository.findOne({
            where: {id: requestId},
            relations: ["order"],
        });

        if (!appointment) {
            throw new NotFoundException("درخواست یافت نشد");
        }

        return this.dataSource.transaction(async (manager) => {
            const slotResult = await this.reserveSlot(
                appointment.tenantId,
                appointment.type,
                appointment.userId,
                appointment.orderId,
            );

            if (!slotResult.success) {
                return {
                    success: false,
                    userId: appointment.userId,
                };
            }

            const consultation = manager.create(Consultation, {
                tenantId: appointment.tenantId,
                userId: appointment.userId,
                appointmentId: appointment.id,
                doctorId: doctorId,
                status: ConsultationStatus.PENDING,
                startedAt: new Date(),
            });

            const savedConsultation = await manager.save(consultation);

            await manager.update(
                Appointment,
                {id: requestId},
                {
                    consultationId: savedConsultation.id,
                    status: AppointmentStatus.IN_PROGRESS,
                },
            );

            const nextInQueue = await this.getNextFromQueue(manager, appointment.tenantId,appointment.id, appointment.type);

            // به‌روزرسانی رکورد صف
            if (appointment.orderId) {
                await manager.update(
                    AppointmentQueue,
                    {orderId: appointment.orderId},
                    {
                        status: QueueStatus.APPROVED,
                        resolvedAt: new Date(),
                        assignedAt: new Date(),
                    },
                );
            }

            return {
                success: true,
                userId: appointment.userId,
                consultationId: savedConsultation.id,
                nextInQueue: nextInQueue ?? undefined,
            };
        });
    }

    /**
     * رد درخواست فوری توسط دکتر
     */
    async rejectInstantRequest(
        requestId: string,
        doctorId: string,
        reason?: string,
    ): Promise<{ success: boolean; nextInQueue: AppointmentQueue | null; userId: string }> {
        const appointment = await this.appointmentRepository.findOne({
            where: {id: requestId},
        });

        if (!appointment) {
            throw new NotFoundException("درخواست یافت نشد");
        }

        return this.dataSource.transaction(async (manager) => {
            await manager.update(
                Appointment,
                {id: requestId},
                {
                    status: AppointmentStatus.CANCELLED,
                    cancelledReason: reason || "رد شده توسط دکتر",
                },
            );

            await manager.update(
                AppointmentQueue,
                {orderId: appointment.orderId},
                {
                    status: QueueStatus.REJECTED,
                    resolvedAt: new Date(),
                    rejectionReason: reason || "رد شده توسط دکتر",
                },
            );

            const nextInQueue = await this.getNextFromQueue(manager, appointment.tenantId,appointment.id, appointment.type);

            if (nextInQueue) {
                await this.notifyNextInQueue(nextInQueue);
            }

            return {
                success: true,
                userId: appointment.userId,
                nextInQueue,
            };
        });
    }

    /**
     * دریافت لیست صف برای یک تنت
     */
    async getQueueList(
        vetId: string,
        filters?: {
            appointmentType?: AppointmentType;
            status?: QueueStatus;
            limit?: number;
            offset?: number;
        },
    ): Promise<{
        items: AppointmentQueue[];
        total: number;
        waitingCount: number;
        inProgressCount: number;
    }> {
        const {appointmentType, status, limit = 50, offset = 0} = filters || {};

        const queryBuilder = this.queueRepository
            .createQueryBuilder("queue")
            .leftJoinAndSelect("queue.appointment", "appointment")
            .where("queue.tenantId = :vetId", {vetId});

        if (appointmentType) {
            queryBuilder.andWhere("queue.appointmentType = :appointmentType", {appointmentType});
        }

        if (status) {
            queryBuilder.andWhere("queue.status = :status", {status});
        }

        const [items, total] = await queryBuilder
            .orderBy("queue.position", "ASC")
            .skip(offset)
            .take(limit)
            .getManyAndCount();

        const waitingCount = await this.queueRepository.count({
            where: {tenantId: vetId, status: QueueStatus.WAITING},
        });

        const inProgressCount = await this.queueRepository.count({
            where: {tenantId: vetId, status: QueueStatus.IN_PROGRESS},
        });

        return {items, total, waitingCount, inProgressCount};
    }

    /**
     * به‌روزرسانی وضعیت یک نفر در صف
     */
    async updateQueueEntry(
        queueId: string,
        doctorId: string,
        updates: {
            status?: QueueStatus;
            scheduledTime?: Date;
            adminNote?: string;
            rejectionReason?: string;
        },
    ): Promise<AppointmentQueue> {
        const queueEntry = await this.queueRepository.findOne({
            where: {id: queueId},
            relations: ["appointment"],
        });

        if (!queueEntry) {
            throw new NotFoundException("رکورد صف یافت نشد");
        }

        Object.assign(queueEntry, updates);

        if (updates.status && ([QueueStatus.APPROVED, QueueStatus.REJECTED, QueueStatus.EXPIRED, QueueStatus.CANCELLED] as QueueStatus[]).includes(updates.status)) {
            queueEntry.resolvedAt = new Date();
        }

        if (updates.status === QueueStatus.APPROVED) {
            queueEntry.assignedAt = new Date();
        }

        return this.queueRepository.save(queueEntry);
    }

    /**
     * شروع مشاوره برای نفر بعدی در صف
     * منطق:
     * 1. اگر کیف پول کافی بود -> پرداخت کیف پول
     * 2. اگر کیف پول کافی نبود -> ایجاد لینک پرداخت آنلاین و انتظار برای تکمیل پرداخت
     */
    async startNextInQueue(
        vetId: string,
        appointmentId: string,
        appointmentType: AppointmentType,
    ): Promise<{
        success: boolean;
        queueEntry?: AppointmentQueue;
        consultationId?: string;
        message: string;
        paymentLink?: string; // لینک پرداخت آنلاین در صورت کمبود موجودی
        requiresPayment?: boolean; // آیا نیاز به پرداخت دارد؟
    }> {
        return this.dataSource.transaction(async (manager) => {
            // ۱. دریافت نفر بعدی در صف
            const nextInQueue = await this.getNextFromQueue(manager, vetId, appointmentId, appointmentType);

            if (!nextInQueue) {
                return {
                    success: false,
                    message: "هیچ نفری در صف نیست",
                };
            }

            // ۲. بررسی وضعیت پرداخت قبلی
            const payment = await manager.findOne(Payment, {
                where: { orderId: nextInQueue.orderId }
            } as any);

            if (payment && payment.status === PaymentStatus.PAID) {
                // قبلاً پرداخت شده، فقط شروع کن
                return await this.finalizeConsultationStart(manager, nextInQueue, vetId, appointmentType);
            }

            // ۳. تلاش برای پرداخت با کیف پول
            const walletResult = await this.processWalletPaymentAttempt(
                manager,
                nextInQueue.orderId,
                nextInQueue.userId,
                vetId
            );

            if (walletResult.success) {
                // پرداخت کیف پول موفق بود
                return await this.finalizeConsultationStart(manager, nextInQueue, vetId, appointmentType);
            }

            // ۴. اگر کیف پول کافی نبود، ایجاد لینک پرداخت آنلاین
            if (walletResult.reason === 'INSUFFICIENT_BALANCE') {
                // ایجاد یک لینک پرداخت موقت یا ریدایرکت به درگاه
                // فرض بر این است که یک سرویس درگاه دارید. اگر ندارید، این بخش را ساده می‌کنیم.
                const paymentLink = await this.createOnlinePaymentLink(
                    manager,
                    nextInQueue.orderId,
                    nextInQueue.userId,
                    nextInQueue.appointmentId,
                    nextInQueue.tenantId,
                    nextInQueue.order.totalAmount // مبلغ را از اورد یا پرداخت بگیریم
                );

                // آپدیت وضعیت پرداخت به AWAITING_PAYMENT یا مشابه
                if (payment) {
                    payment.status = PaymentStatus.AWAITING_PAYMENT; // فرض بر این است که این وضعیت را دارید
                    await manager.save(payment);
                }

                // اگر پرداخت کیف پول ناموفق بود و لینک آنلاین ساخته شد:
                await this.notificationQueue.add("handle-notification", {
                    userId: nextInQueue.userId,
                    type: NotificationType.IN_APP, // یا PUSH
                    title: "پرداخت نوبت نیازمند اقدام است",
                    message: `لطفاً با کلیک روی لینک زیر، مبلغ ${nextInQueue.order.totalAmount} تومان را پرداخت کنید تا نوبت شما فعال شود: ${paymentLink}`,
                    icon: "credit-card",
                    color: "warning",
                    panelType: "VET-CLINIC-PHARMACY",
                    data: {
                        action: "GO_TO_PAYMENT",
                        link: paymentLink // کاربر می‌تواند روی لینک در نوتیفیکیشن کلیک کند
                    }
                });

                return {
                    success: true, // نوبت رزرو شد اما منتظر پرداخت است
                    queueEntry: nextInQueue,
                    message: "لینک پرداخت برای کاربر ارسال شد.بعداز پرداخت کاربر پیام برای شما ارسال می شود",
                    requiresPayment: true,
                    paymentLink: paymentLink,
                    consultationId: null // مشاوره شروع نشده تا پرداخت انجام شود
                };
            }

            // خطای دیگر
            throw new BadRequestException(walletResult.message);

        });
    }

    /**
     * متد کمکی: تلاش برای پرداخت با کیف پول
     */
    private async processWalletPaymentAttempt(
        manager: EntityManager,
        orderId: string,
        userId: string,
        tenantId: string
    ): Promise<{ success: boolean; message: string; reason?: string }> {
        try {
            const payment = await manager.findOne(Payment, {
                where: { orderId, status: PaymentStatus.PENDING }
            } as any);

            if (!payment) {
                // اگر پرداختی پیدا نشد، فرض می‌کنیم قبلاً پرداخت شده یا خطا دارد
                // اما در سناریوی ما، باید پرداخت PENDING وجود داشته باشد.
                return { success: false, message: "رکورد پرداخت یافت نشد" };
            }

            const userWallet = await manager.findOne(Wallet, {
                where: { userId, type: WalletType.USER }
            } as any);

            if (!userWallet) {
                return { success: false, message: "کیف پول کاربر یافت نشد" };
            }

            const amount = Number(payment.amount);

            if (Number(userWallet.balance) >= amount) {
                // موجودی کافی است، پرداخت انجام شود
                await this.executeWalletPayment(manager, userWallet, tenantId, payment, orderId);
                return { success: true, message: "پرداخت کیف پول موفق" };
            } else {
                // موجودی کافی نیست
                return { success: false, message: "موجودی ناکافی", reason: 'INSUFFICIENT_BALANCE' };
            }

        } catch (error) {
            this.logger.error(`خطا در بررسی کیف پول: ${error.message}`, error.stack);
            return { success: false, message: "خطای سیستمی" };
        }
    }

    /**
     * متد کمکی: اجرای تراکنش کیف پول
     */
    private async executeWalletPayment(
        manager: EntityManager,
        userWallet: Wallet,
        tenantId: string,
        payment: Payment,
        orderId: string
    ): Promise<void> {
        const amount = Number(payment.amount);

        // کسر از کاربر
        userWallet.balance = Number(userWallet.balance) - amount;
        await manager.save(userWallet);

        const userTx = manager.create(WalletTransaction, {
            walletId: userWallet.id,
            type: WalletTransactionType.DEBIT,
            amount: amount,
            balanceAfter: userWallet.balance,
            description: `پرداخت نوبت کلینیک شماره ${orderId}`,
            referenceId: payment.id
        });
        await manager.save(userTx);

        // واریز به کلینیک
        const clinicWallet = await manager.findOne(Wallet, {
            where: { tenantId, type: WalletType.SHOP }
        } as any);

        if (!clinicWallet) throw new Error("کیف پول کلینیک یافت نشد");

        clinicWallet.balance = Number(clinicWallet.balance) + amount;
        await manager.save(clinicWallet);

        const clinicTx = manager.create(WalletTransaction, {
            walletId: clinicWallet.id,
            type: WalletTransactionType.CREDIT,
            amount: amount,
            balanceAfter: clinicWallet.balance,
            description: `درآمد نوبت شروع شده شماره ${orderId}`,
            referenceId: payment.id
        });
        await manager.save(clinicTx);

        // آپدیت وضعیت پرداخت
        payment.status = PaymentStatus.PAID;
        await manager.save(payment);

        // آپدیت وضعیت سفارش
        await manager.update(Order, { id: orderId }, { status: OrderStatus.CUSTOMER_PAID });
    }

    /**
     * متد کمکی: ایجاد لینک پرداخت آنلاین
     * این متد باید به سرویس درگاه پرداخت متصل شود.
     * اگر سرویس درگاه ندارید، این متد یک URL فرضی برمی‌گرداند.
     */
    private async createOnlinePaymentLink(
        manager: EntityManager,
        orderId: string,
        userId: string,
        appointmentId:string,
        tenantId:string,
        amount: number
    ): Promise<string> {
        // فرض: شما یک سرویس درگاه دارید که متد createPaymentLink دارد.
        // اگر ندارید، می‌توانید از یک URL ساده استفاده کنید.

        // مثال فرضی:
        // const gatewayService = this.getGatewayService();
        // return await gatewayService.createPaymentLink(orderId, amount, userId);
        //https://your-domain.com/payment?orderId=ORD-123456789&appointmentId=APT-987654321&tenantId=CLINIC-111
        // برای تست، یک لینک فرضی برمی‌گردانیم:
        return `http://localhost:6507/payment?orderId=${orderId}&appointmentId=${appointmentId}&tenantId=${tenantId}`;
    }

    /**
     * متد نهایی: شروع مشاوره پس از موفقیت پرداخت
     */
    private async finalizeConsultationStart(
        manager: EntityManager,
        nextInQueue: AppointmentQueue,
        vetId: string,
        appointmentType: AppointmentType
    ): Promise<any> {
        let savedConsultation: Consultation | null = null;

        if (appointmentType === AppointmentType.ONLINE_CHAT) {
            const consultation = manager.create(Consultation, {
                tenantId: vetId,
                userId: nextInQueue.userId,
                petId:nextInQueue.appointment.petId,
                appointmentId: nextInQueue.appointmentId || undefined,
                doctorId: vetId,
                status: ConsultationStatus.PENDING,
                requestStatus:ConsultationStatus.REQUEST_SENT,
                startedAt: new Date(),
            });
            savedConsultation = await manager.save(consultation);

            await manager.update(
                Appointment,
                { id: nextInQueue.appointmentId },
                { consultationId: savedConsultation.id ,status:AppointmentStatus.IN_CHAT}
            );
        }

        // اطلاع‌رسانی
        try {
            await this.notificationQueue.add("handle-notification", {
                userId: nextInQueue.userId,
                type: NotificationType.IN_APP,
                title: "مشاوره شما شروع شد! 📞",
                message: "پرداخت انجام شد و دکتر آماده مشاوره است.",
                icon: "phone",
                color: "success",
                panelType: "VET-CLINIC-PHARMACY",
                data: {
                    consultationId: savedConsultation?.id,
                    orderId: nextInQueue.orderId,
                },
            });
        } catch (error) {
            this.logger.error(`خطا در ارسال نوتیفیکیشن: ${error.message}`, error.stack);
        }

        return {
            success: true,
            queueEntry: nextInQueue,
            consultationId: savedConsultation?.id,
            message: "مشاوره با موفقیت شروع شد",
            requiresPayment: false
        };
    }

    /**
     * پایان مشاوره و آزادسازی اسلات
     */
    async endConsultation(
        vetId: string,
        appointmentType: AppointmentType,
        consultationId: string,
    ): Promise<{
        success: boolean;
        nextInQueue?: AppointmentQueue;
        message: string;
    }> {
        return this.dataSource.transaction(async (manager) => {
            // پایان مشاوره
            await manager.update(
                Consultation,
                {id: consultationId},
                {
                    status: ConsultationStatus.COMPLETED,
                    endedAt: new Date(),
                } as any,
            );

            // به‌روزرسانی appointment
            const appointment = await manager.findOne(Appointment, {
                where: {consultationId},
            } as any);

            if (appointment) {
                appointment.isActive = false;
                appointment.status = AppointmentStatus.COMPLETED;
                appointment.endedAt = new Date();
                await manager.save(appointment);

                // آزادسازی اسلات و通知 نفر بعدی
                const nextInQueue = await this.getNextFromQueue(manager, vetId,appointment.id, appointmentType);

                if (nextInQueue) {
                    await this.notifyNextInQueue(nextInQueue);

                    return {
                        success: true,
                        nextInQueue,
                        message: `مشاوره تمام شد. نفر بعدی (position: ${nextInQueue.position}) مطلع شد.`,
                    };
                }

                return {
                    success: true,
                    message: "مشاوره تمام شد. صف خالی است.",
                };
            }

            return {
                success: false,
                message: "مشاوره یافت نشد",
            };
        });
    }

    /**
     * دریافت آمار صف برای داشبورد
     */
    async getQueueStats(vetId: string): Promise<{
        totalWaiting: number;
        totalInProgress: number;
        totalResolvedToday: number;
        averageWaitTime: number;
        byType: {
            chat: { waiting: number; inProgress: number };
            phoneInstant: { waiting: number; inProgress: number };
            phoneScheduled: { waiting: number; inProgress: number };
        };
    }> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [totalWaiting, totalInProgress] = await Promise.all([
            this.queueRepository.count({
                where: {tenantId: vetId, status: QueueStatus.WAITING},
            }),
            this.queueRepository.count({
                where: {tenantId: vetId, status: QueueStatus.IN_PROGRESS},
            }),
        ]);

        const resolvedToday = await this.queueRepository
            .createQueryBuilder("queue")
            .where("queue.tenantId = :vetId", {vetId})
            .andWhere("queue.resolvedAt >= :today", {today})
            .andWhere("queue.status IN (:...statuses)", {
                statuses: [QueueStatus.APPROVED, QueueStatus.COMPLETED],
            })
            .getMany();

        const totalResolvedToday = resolvedToday.length;
        const averageWaitTime =
            resolvedToday.length > 0
                ? Math.round(
                    resolvedToday.reduce((sum, q) => sum + (q.actualWaitMinutes || q.estimatedWaitMinutes), 0) /
                    resolvedToday.length,
                )
                : 0;

        // آمار بر اساس نوع
        const getTypeStats = async (type: AppointmentType) => {
            const [waiting, inProgress] = await Promise.all([
                this.queueRepository.count({
                    where: {
                        tenantId: vetId,
                        appointmentType: type,
                        status: QueueStatus.WAITING,
                    },
                }),
                this.queueRepository.count({
                    where: {
                        tenantId: vetId,
                        appointmentType: type,
                        status: QueueStatus.IN_PROGRESS,
                    },
                }),
            ]);
            return {waiting, inProgress};
        };

        const [chatStats, phoneInstantStats, phoneScheduledStats] = await Promise.all([
            getTypeStats(AppointmentType.ONLINE_CHAT),
            getTypeStats(AppointmentType.PHONE_INSTANT),
            getTypeStats(AppointmentType.PHONE_SCHEDULED),
        ]);

        return {
            totalWaiting,
            totalInProgress,
            totalResolvedToday,
            averageWaitTime,
            byType: {
                chat: chatStats,
                phoneInstant: phoneInstantStats,
                phoneScheduled: phoneScheduledStats,
            },
        };
    }

    /**
     * جابجایی position در صف
     */
    async reorderQueue(
        queueId: string,
        newPosition: number,
        doctorId: string,
    ): Promise<{ success: boolean; message: string }> {
        return this.dataSource.transaction(async (manager) => {
            const queueEntry = await manager.findOne(AppointmentQueue, {
                where: {id: queueId},
            } as any);

            if (!queueEntry) {
                throw new NotFoundException("رکورد صف یافت نشد");
            }

            if (queueEntry.status !== QueueStatus.WAITING) {
                return {
                    success: false,
                    message: "فقط می‌توان position نوبت‌های در انتظار را تغییر داد",
                };
            }

            const oldPosition = queueEntry.position;
            queueEntry.position = newPosition;
            await manager.save(queueEntry);

            // جابجا کردن بقیه
            if (newPosition < oldPosition) {
                // حرکت به بالا
                await manager
                    .createQueryBuilder()
                    .update(AppointmentQueue)
                    .set({position: () => "position + 1"})
                    .where("tenantId = :tenantId", {tenantId: queueEntry.tenantId})
                    .andWhere("appointmentType = :appointmentType", {
                        appointmentType: queueEntry.appointmentType,
                    })
                    .andWhere("status = :status", {status: QueueStatus.WAITING})
                    .andWhere("position >= :newPosition", {newPosition})
                    .andWhere("position < :oldPosition", {oldPosition})
                    .andWhere("id != :queueId", {queueId})
                    .execute();
            } else if (newPosition > oldPosition) {
                // حرکت به پایین
                await manager
                    .createQueryBuilder()
                    .update(AppointmentQueue)
                    .set({position: () => "position - 1"})
                    .where("tenantId = :tenantId", {tenantId: queueEntry.tenantId})
                    .andWhere("appointmentType = :appointmentType", {
                        appointmentType: queueEntry.appointmentType,
                    })
                    .andWhere("status = :status", {status: QueueStatus.WAITING})
                    .andWhere("position > :oldPosition", {oldPosition})
                    .andWhere("position <= :newPosition", {newPosition})
                    .andWhere("id != :queueId", {queueId})
                    .execute();
            }

            return {
                success: true,
                message: `position از ${oldPosition} به ${newPosition} تغییر کرد`,
            };
        });
    }

    /**
     * زمان‌بندی پاک‌سازی خودکار صف
     */
    @Cron("0 3 * * *") // هر روز ساعت 3 صبح
    async cleanupOldQueueEntries(): Promise<void> {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const oldEntries = await this.queueRepository
            .createQueryBuilder("queue")
            .where("queue.createdAt < :threshold", {threshold: thirtyDaysAgo})
            .andWhere("queue.status IN (:...statuses)", {
                statuses: [
                    QueueStatus.APPROVED,
                    QueueStatus.REJECTED,
                    QueueStatus.EXPIRED,
                    QueueStatus.CANCELLED,
                ],
            })
            .getMany();

        for (const entry of oldEntries) {
            await this.queueRepository.delete({id: entry.id});
            this.logger.log(`🗑️ رکورد صف قدیمی ${entry.id} حذف شد`);
        }

        if (oldEntries.length > 0) {
            this.logger.log(`🗑️ ${oldEntries.length} رکورد صف قدیمی حذف شد`);
        }
    }

    public async sendPushNotificationForQueueUpdate(
        userId: string,
        newPosition: number,
        orderId: string
    ): Promise<void> {
        try {
            await this.notificationQueue.add('handle-notification', {
                userId: userId,
                type: NotificationType.PUSH,
                title: 'تغییر وضعیت صف',
                message: `موقعیت شما در صف به ${newPosition} تغییر کرد.`,
                icon: 'access_time',
                color: 'warning',
                panelType: 'VET-CLINIC-PHARMACY',
                data: {
                    type: 'QUEUE_POSITION_CHANGED',
                    position: newPosition,
                    orderId: orderId
                }
            });

            this.logger.log(`📱 نوتیفیکیشن تغییر پوزیشن صف برای کاربر ${userId} در صف ارسال قرار گرفت.`);
        } catch (error) {
            this.logger.error(`خطا در ارسال نوتیفیکیشن تغییر پوزیشن برای کاربر ${userId}: ${error.message}`, error.stack);
        }
    }

    public async sendPushNotificationForConsultationStart(
        userId: string,
        consultationId: string,
        appointmentId: string
    ): Promise<void> {
        try {
            // اضافه کردن کار به صف نوتیفیکیشن برای پردازش غیرهمزمان
            await this.notificationQueue.add('handle-notification', {
                userId: userId,
                type: NotificationType.PUSH, // فرض بر این است که نوع نوتیفیکیشن پش است
                title: 'نوبت شما شروع شد! 🎉',
                message: 'مشاوره شما آماده است. لطفاً وارد اپلیکیشن شوید.',
                icon: 'heartbeat',
                color: 'success',
                panelType: 'VET-CLINIC-PHARMACY',
                data: {
                    type: 'CONSULTATION_STARTED',
                    consultationId: consultationId,
                    appointmentId: appointmentId
                }
            });

            this.logger.log(`📱 نوتیفیکیشن شروع مشاوره برای کاربر ${userId} در صف ارسال قرار گرفت.`);
        } catch (error) {
            this.logger.error(`خطا در ارسال نوتیفیکیشن شروع مشاوره برای کاربر ${userId}: ${error.message}`, error.stack);
            // در صورت خطا، می‌توانیم یک رکورد در جدول نوتیفیکیشن‌های ذخیره شده (DB) هم ایجاد کنیم
            // تا کاربر وقتی آنلاین شد، آن را ببیند.
        }
    }
}