import {Injectable} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {DataSource, LessThan, Repository} from 'typeorm';
import {Appointment, AppointmentStatus, AppointmentType} from "../entities/appointment.entity";
import {toGregorian} from "jalaali-js";
import {Cron} from "@nestjs/schedule";
import {ReservationStatus, TemporarySlotReservation} from "./entities/temporary-slot-reservation.entity";
import {NotificationType} from "../../../shared/notification/notification.entity";
import {AppointmentQueue, QueueStatus} from "./entities/appointment-queue.entity";
import {InjectQueue} from "@nestjs/bull";
import {Queue} from "bull";

@Injectable()
export class AppointmentService {
    constructor(
        private readonly dataSource:DataSource,
        @InjectRepository(Appointment)
        private appointmentRepository: Repository<Appointment>,
        @InjectQueue("notifications") private readonly notificationQueue: Queue,
        @InjectQueue("cleanup") private readonly cleanupQueue: Queue,
        //private readonly paymentService: PaymentService,
    ) {}

    /**
     * بررسی تداخل نوبت‌ها - برای همه انواع سرویس‌ها
     * هر نوع ویزیتی که در یک زمان خاص باشه، باید اینجا چک بشه
     */
    async checkSlotConflict(
        tenantId: string,
        targetDate: Date,
        targetTime?: string,
        excludeAppointmentId?: string
    ): Promise<{ conflict: boolean; conflictingAppointment?: Appointment }> {
        const repository = this.dataSource.getRepository(Appointment)

        // محدوده زمانی: ±30 دقیقه (یک slot کامل)
        // برای آنلاین/تلفنی هم همین منطق اعمال میشه
        const slotStart = new Date(targetDate)

        let hours = 0;
        let minutes = 0;

        if (targetTime) {
            const timeParts = targetTime.split(':').map(Number);
            hours = timeParts[0] || 0;
            minutes = timeParts[1] || 0;
        }
        slotStart.setHours(hours, minutes, 0, 0)

        const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000) // +30 دقیقه

        // جستجو برای نوبت‌های فعال در این بازه زمانی
        const query = repository
            .createQueryBuilder('apt')
            .where('apt.tenantId = :tenantId', { tenantId })
            .andWhere('apt.appointmentDate >= :slotStart', { slotStart })
            .andWhere('apt.appointmentDate < :slotEnd', { slotEnd })
            .andWhere('apt.status NOT IN (:...excludedStatuses)', {
                excludedStatuses: [
                    AppointmentStatus.CANCELLED,
                    AppointmentStatus.REJECTED,
                    AppointmentStatus.NO_SHOW
                ]
            })

        if (excludeAppointmentId) {
            query.andWhere('apt.id != :excludeAppointmentId', { excludeAppointmentId })
        }

        const conflictingAppointment = await query.getOne()

        return {
            conflict: !!conflictingAppointment,
            conflictingAppointment: conflictingAppointment || undefined
        }
    }

    /**
     * رزرو موقت اسلات (Soft Lock)
     * یک قفل ۱۰ دقیقه‌ای روی زمان انتخابی ایجاد می‌کنه
     */
    async reserveSlotTemporary(
        tenantId: string,
        userId: string,
        date?: string,      // فرمت: "1404/12/09"
        time?: string,      // فرمت: "10:30"

    ): Promise<{
        success: boolean
        reservationId?: string
        expiresAt?: Date
        error?: string
    }> {
        const repository = this.dataSource.getRepository(TemporarySlotReservation)

        // تبدیل تاریخ شمسی به میلادی
        let jYear = 0;
        let jMonth = 0;
        let jDay = 0;
        let jHour = 0;
        let jMinute = 0;

        if (date && time) {
            const dateParts = date.split('/').map(Number);
            const timeParts = time.split(':').map(Number);

            jYear = dateParts[0] || 0;
            jMonth = dateParts[1] || 0;
            jDay = dateParts[2] || 0;
            jHour = timeParts[0] || 0;
            jMinute = timeParts[1] || 0;
        }
        const { gy, gm, gd } = toGregorian(jYear, jMonth, jDay)
        const slotDate = new Date(gy, gm - 1, gd, jHour, jMinute, 0)

        // بررسی تداخل
        const conflictCheck = await this.checkSlotConflict(tenantId, slotDate, time)
        if (conflictCheck.conflict) {
            return {
                success: false,
                error: 'این زمان قبلاً توسط کاربر دیگری رزرو شده است'
            }
        }

        // بررسی وجود رزرو موقت فعال
        const existingReservation = await repository.findOne({
            where: {
                tenantId,
                slotDate,
                time,
                status: ReservationStatus.ACTIVE
            }
        })

        if (existingReservation) {
            // اگه مال خود کاربره، تمدید کن
            if (existingReservation.userId === userId) {
                existingReservation.expiresAt = new Date(Date.now() + 10 * 60 * 1000)
                await repository.save(existingReservation)
                return {
                    success: true,
                    reservationId: existingReservation.id,
                    expiresAt: existingReservation.expiresAt
                }
            }
            // اگه مال کاربر دیگه‌ست
            return {
                success: false,
                error: 'این زمان توسط کاربر دیگری در حال رزرو است. لطفاً چند دقیقه صبر کنید یا زمان دیگری انتخاب کنید.'
            }
        }

        // ایجاد رزرو موقت جدید
        const RESERVATION_MINUTES = 10
        const expiresAt = new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000)

        const tempReservation = repository.create({
            tenantId,
            userId,
            slotDate,
            time,
            expiresAt,
            status: ReservationStatus.ACTIVE
        })

        const saved = await repository.save(tempReservation)

        // زمان‌بندی پاک‌سازی خودکار بعد از انقضا
        await this.scheduleReservationCleanup(saved.id, RESERVATION_MINUTES)

        return {
            success: true,
            reservationId: saved.id,
            expiresAt
        }
    }

    /**
     * پاک‌سازی رزروهای منقضی شده
     */
    @Cron('*/5 * * * *') // هر ۵ دقیقه
    async cleanupExpiredReservations() {
        const repository = this.dataSource.getRepository(TemporarySlotReservation)

        const expired = await repository.find({
            where: {
                status: ReservationStatus.ACTIVE,
                expiresAt: LessThan(new Date())
            }
        })

        for (const res of expired) {
            res.status = ReservationStatus.EXPIRED
            await repository.save(res)
            console.log(`🧹 رزرو موقت ${res.id} منقضی شد و آزاد شد`)
        }
    }

    /**
     * زمان‌بندی پاک‌سازی با Bull Queue
     */
    private async scheduleReservationCleanup(reservationId: string, delayMinutes: number) {
        await this.cleanupQueue.add(
            'cleanup-reservation',
            { reservationId },
            {
                delay: delayMinutes * 60 * 1000,
                removeOnComplete: true,
                removeOnFail: false
            }
        )
    }


    /**
     * تأیید رزرو موقت و تبدیل به نوبت نهایی
     */
    async confirmSlotReservation(
        reservationId: string,
        orderId: string,
        userId: string
    ): Promise<{ success: boolean; appointment?: Appointment; error?: string }> {
        const reservationRepo = this.dataSource.getRepository(TemporarySlotReservation)
        const appointmentRepo = this.dataSource.getRepository(Appointment)

        const reservation = await reservationRepo.findOne({
            where: { id: reservationId }
        })

        if (!reservation) {
            return { success: false, error: 'رزرو یافت نشد' }
        }

        if (reservation.status !== 'ACTIVE') {
            return { success: false, error: 'رزرو منقضی یا لغو شده است' }
        }

        if (reservation.userId !== userId) {
            return { success: false, error: 'این رزرو متعلق به شما نیست' }
        }

        // بررسی دوباره تداخل (ممکنه در ۱۰ دقیقه کسی رزرو کرده باشه)
        const conflictCheck = await this.checkSlotConflict(
            reservation.tenantId,
            reservation.slotDate,
            reservation.time
        )

        if (conflictCheck.conflict) {
            reservation.status = ReservationStatus.CONFLICTED
            await reservationRepo.save(reservation)
            return {
                success: false,
                error: 'متأسفانه این زمان توسط کاربر دیگری رزرو شده است. هزینه به حساب شما برگردانده می‌شود.'
            }
        }

        // به‌روزرسانی وضعیت رزرو
        reservation.status = ReservationStatus.CONFIRMED
        reservation.orderId = orderId
        await reservationRepo.save(reservation)

        // آپدیت appointment با اطلاعات نهایی
        await appointmentRepo.update(
            { orderId },
            {
                appointmentDate: reservation.slotDate,
                status: AppointmentStatus.CONFIRMED
            }
        )

        const appointment = await appointmentRepo.findOne({ where: { orderId } })

        return { success: true, appointment: appointment ?? undefined }
    }

    /**
     * افزودن به صف انتظار
     */
    async addToQueue(
        tenantId: string,
        appointment:Appointment,
        appointmentType: AppointmentType,
        userId: string,
        orderId: string,
        preferredTime?: { date: string; time: string }
    ): Promise<{
        success: boolean
        queueInfo?: {
            queueNumber: number
            position: number
            estimatedWaitMinutes: number
        }
        error?: string
    }> {
        const queueRepo = this.dataSource.getRepository(AppointmentQueue)

        // محاسبه موقعیت در صف
        const currentQueueLength = await queueRepo.count({
            where: {
                tenantId,
                status: QueueStatus.WAITING
            }
        })

        const position = currentQueueLength + 1

        // تخمین زمان انتظار (هر مشاوره ~15 دقیقه)
        const estimatedWaitMinutes = position * 15

        // اگه زمان ترجیحی مشخص شده، ذخیره کن
        if (preferredTime) {
            const [jYear, jMonth, jDay] = preferredTime.date.split('/').map(Number)
            const [hours, minutes] = preferredTime.time.split(':').map(Number)
            const { gy, gm, gd } = toGregorian(jYear, jMonth, jDay)
            preferredTime.date = String(new Date(gy, gm - 1, gd, hours, minutes, 0))
        }

        const queueEntry = queueRepo.create({
            tenantId,
            userId,
            orderId,
            appointment,
            appointmentType,
            position,
            //preferredTime: preferredTime?.date || null,
            status: QueueStatus.WAITING,
            estimatedWaitMinutes
        })

        const saved = await queueRepo.save(queueEntry)

        return {
            success: true,
            queueInfo: {
                queueNumber: Number(saved.id.slice(-6)),
                position,
                estimatedWaitMinutes
            }
        }
    }

    /**
     * تأیید یا رد نوبت از صف توسط دکتر
     */
    async resolveQueueEntry(
        queueId: string,
        doctorId: string,
        action: 'APPROVE' | 'REJECT',
        scheduledTime?: Date
    ): Promise<{ success: boolean; error?: string }> {
        const queueRepo = this.dataSource.getRepository(AppointmentQueue)
        const appointmentRepo = this.dataSource.getRepository(Appointment)
        const queueEntry = await queueRepo.findOne({ where: { id: queueId } })

        if (!queueEntry) {
            return { success: false, error: 'رکورد صف یافت نشد' }
        }

        if (action === 'REJECT') {
            // رد کردن → برگشت پول (در payment service)
            queueEntry.status = QueueStatus.REJECTED
            queueEntry.resolvedAt = new Date()
            await queueRepo.save(queueEntry)

            // trigger refund
            //await this.paymentService.initiateRefund(queueEntry.orderId, 'APPOINTMENT_REJECTED')

            await this.notificationQueue.add("handle-notification", {
                userId: queueEntry.userId,
                type: NotificationType.IN_APP,
                title: "نوبت شما رد شد",
                message: "دکتر امکان پذیرش شما را در زمان درخواستی ندارد. هزینه به حساب شما برگشت داده شد.",
                icon: "heartbeat",
                color: "failed",
                panelType: "VET-CLINIC-PHARMACY",
                data: {
                    orderId: queueEntry.orderId,
                    queueId: queueEntry.id,
                },
            });

            return { success: true }
        }

        // تأیید → تنظیم زمان نهایی
        if (!scheduledTime) {
            return { success: false, error: 'زمان جایگزین باید مشخص شود' }
        }

        // بررسی تداخل
        const timeStr = `${scheduledTime.getHours()}:${scheduledTime.getMinutes().toString().padStart(2, '0')}`
        const conflictCheck = await this.checkSlotConflict(
            queueEntry.tenantId,
            scheduledTime,
            timeStr
        )

        if (conflictCheck.conflict) {
            return { success: false, error: 'زمان انتخابی تداخل دارد' }
        }

        // به‌روزرسانی
        queueEntry.status = QueueStatus.APPROVED
        queueEntry.resolvedAt = new Date()
        queueEntry.scheduledTime = scheduledTime
        await queueRepo.save(queueEntry)

        // آپدیت appointment
        await appointmentRepo.update(
            { orderId: queueEntry.orderId },
            {
                appointmentDate: scheduledTime,
                status: AppointmentStatus.CONFIRMED
            }
        )

        await this.notificationQueue.add("handle-notification", {
            userId: queueEntry.userId,
            type: NotificationType.IN_APP,
            title: "نوبت شما تأیید شد",
            message: `نوبت شما برای ${scheduledTime.toLocaleString('fa-IR')} تنظیم شد`,
            icon: "heartbeat",
            color: "success",
            panelType: "VET-CLINIC-PHARMACY",
            data: {
                orderId: queueEntry.orderId,
                queueId: queueEntry.id,
            },
        });

        return { success: true }
    }

    async getUserQueueStatus(userId: string, tenantId: string, serviceType: AppointmentType) {
        return await this.dataSource
            .getRepository(AppointmentQueue)
            .createQueryBuilder('queue')
            .where('queue.userId = :userId', { userId })
            .andWhere('queue.tenantId = :tenantId', { tenantId })
            //.andWhere('queue.appointmentType = :appointmentType', { appointmentType: this.getServiceKey(serviceType) })
            .andWhere('queue.status IN (:...statuses)', {
                statuses: [QueueStatus.WAITING, QueueStatus.IN_PROGRESS] // فقط اگر در صف باشد یا نوبتش رسیده باشد
            })
            .orderBy('queue.position', 'ASC') // اگر چندتا بود، اولی را برگردان
            .getOne();
    }

    async isUserBusyForVet(userId: string, tenantId: string): Promise<boolean> {
        // جستجوی نوبتی که مربوط به این کاربر و این دکتر باشد
        const appointment = await this.appointmentRepository.findOne({
            where: { userId, tenantId },
            order: { createdAt: 'DESC' } // جدیدترین نوبت را چک می‌کنیم
        });

        if (!appointment) {
            return false; // نوبتی وجود ندارد، پس کاربر آزاد است
        }

        // بررسی وضعیت‌هایی که نشان می‌دهد کاربر مشغول است یا در صف است
        // 1. IN_PROGRESS: کاربر در حال ویزیت است
        // 2. WAITING: کاربر در صف انتظار است (اگر می‌خواهید در صف هم نوبت جدید نگیرد)
        // 3. PENDING: نوبت گرفته شده اما هنوز شروع نشده (بسته به تعریف شما)

        const busyStatuses = [
            AppointmentStatus.IN_PROGRESS,
            AppointmentStatus.WAITING, // اگر می‌خواهید در صف هم نتواند نوبت جدید بگیرد
            //AppointmentStatus.PENDING  // اگر PENDING هم به معنی "در انتظار شروع" است
        ];

        return busyStatuses.includes(appointment.status);
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

}