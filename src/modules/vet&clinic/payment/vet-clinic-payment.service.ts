import {DataSource, EntityManager} from "typeorm";
import {BadRequestException, Injectable, InternalServerErrorException, NotFoundException} from "@nestjs/common";
import {TenantContext} from "../../../tenants/tenant-context.service";
import {Order} from "../../../shared/order/order.entity";
import {OrderStatus} from "../../../shared/order/order-status.enum";
import {Payment} from "../../../shared/gateways/payments/payment.entity";
import {PaymentStatus} from "../../../shared/gateways/payments/payment-status-machine.enum";
import {WalletService} from "../../../shared/wallet/wallet.service";
import {WalletType} from "../../../shared/wallet/wallet.entity";
import {OrderType} from "../../../shared/order/order-type.enum";
import {Transaction, TransactionStatus, TransactionType} from "../../../shared/transaction/transaction.entity";
import {WalletTransactionType} from "../../../shared/wallet/wallet-transaction.entity";
import {NotificationService} from "../../../shared/notification/notification.service";
import {NotificationType} from "../../../shared/notification/notification.entity";
import {User} from "../../../shared/user/entities/user.entity";
import {InjectQueue} from "@nestjs/bull";
import {Queue} from "bull";
import {OrderStateMachineService} from "../../market/payment/order-state-machine.service";
import {Appointment, AppointmentStatus, AppointmentType} from "../entities/appointment.entity";
import {toGregorian, toJalaali} from 'jalaali-js';
import {I18nService} from "nestjs-i18n";
import {ClinicCapacityService} from "../clinic-capacity.service";
import {AppointmentService} from "../appointment/appointment.service";
import {QueueStatus} from "../appointment/entities/appointment-queue.entity";
import {Consultation, ConsultationStatus} from "../../../socket/consultation/consultation.entity";
import {VetClinicOrderDto, VetServiceType} from "./dto/vet-clinic-order-dto";

@Injectable()
export class VetClinicPaymentService {
    // فرض: درصد کارمزد پلتفرم در کانتیستر یا تنظیمات تعریف شده است
    private platformFeePercent = 5; // مثال: 5 درصد
    constructor(
        private readonly i18n: I18nService,
        @InjectQueue('send-sms') private smsQueue: Queue,
        private notifService: NotificationService,
        private dataSource: DataSource,
        private walletService: WalletService,
        private tenantContext: TenantContext,
        private orderStateMachine: OrderStateMachineService,
        private readonly clinicCapacityService: ClinicCapacityService,
        private appointmentService: AppointmentService,
    ) {
    }

    /**
     * نقطه ورود اصلی - اصلاح شده
     */
    async submitOrderAndPay(payload: VetClinicOrderDto, userId: string) {
        const serviceType = payload.serviceType
        const isInstantService = ([VetServiceType.TEXT, VetServiceType.PHONE_INSTANT] as VetServiceType[]).includes(serviceType)
        const isScheduledService = ([VetServiceType.PHONE_SCHEDULED] as VetServiceType[]).includes(serviceType)
        const isTimedService = ([VetServiceType.IN_PERSON, VetServiceType.HOME] as VetServiceType[]).includes(serviceType)

        // ──────────────────────────────────────────────────────────
        // 🔵 سرویس‌های زمان‌دار (in-person, home)
        // ──────────────────────────────────────────────────────────
        if (isTimedService) {
            return this.handleTimedServiceOrder(payload, userId)
        }

        // ──────────────────────────────────────────────────────────
        // 🟡 سرویس‌های زمان‌بندی شده (phone-scheduled)
        // ──────────────────────────────────────────────────────────
        if (isScheduledService) {
            return this.handleScheduledServiceOrder(payload, userId)
        }

        // ──────────────────────────────────────────────────────────
        // 🟠 سرویس‌های آنی (text, phone-instant)
        // ──────────────────────────────────────────────────────────
        if (isInstantService) {
            return this.handleInstantServiceOrder(payload, userId)
        }

        throw new BadRequestException(await this.i18n.t('error.service_not_credit'))
    }

    /**
     * پردازش سرویس‌های زمان‌دار (حضوری، منزل)
     * نیاز به انتخاب زمان داره
     */
    private async handleTimedServiceOrder(
        payload: VetClinicOrderDto,
        userId: string
    ) {
        // ۱. تبدیل تاریخ شمسی به میلادی
        let jYear = 0;
        let jMonth = 0;
        let jDay = 0;
        let hours = 0;
        let minutes = 0;
        if (payload.reservedTime?.date && payload.reservedTime?.time) {
            const dateParts = payload.reservedTime.date.split('/').map(Number);
            const timeParts = payload.reservedTime.time.split(':').map(Number);
            jYear = dateParts[0] || 0;
            jMonth = dateParts[1] || 0;
            jDay = dateParts[2] || 0;
            hours = timeParts[0] || 0;
            minutes = timeParts[1] || 0;
        }
        const {gy, gm, gd} = toGregorian(jYear, jMonth, jDay)
        const appointmentDate = new Date(gy, gm - 1, gd, hours, minutes, 0)

        // ۲. بررسی تداخل (برای همه نوع ویزیت‌ها)
        const conflictCheck = await this.clinicCapacityService.checkSlotConflict(
            payload.tenantId,
            appointmentDate,
            payload.reservedTime.time
        )

        if (conflictCheck.conflict) {
            throw new BadRequestException(
                'این زمان قبلاً توسط نوبت دیگری رزرو شده است. لطفاً زمان دیگری انتخاب کنید.'
            )
        }

        // ۳. رزرو موقت (soft lock)
        const reservation = await this.appointmentService.reserveSlotTemporary(
            payload.tenantId,
            userId,
            payload.reservedTime.date,
            payload.reservedTime.time,
        )

        if (!reservation.success) {
            throw new BadRequestException(reservation.error)
        }

        // ۴. ایجاد سفارش اولیه
        const orderData = await this.createInitialOrder(payload, userId)

        // ۵. ذخیره reservationId روی payment metadata
        const currentMetadata = orderData.payment.metadata || {};

        await this.dataSource.getRepository(Payment).update(
            {id: orderData.payment.id},
            {
                metadata: {
                    ...currentMetadata,
                    temporaryReservationId: reservation.reservationId ?? null,
                    reservedTime: payload.reservedTime ?? null
                } as any
            }
        )

        // ۶. پرداخت
        if (payload.paymentMethod === 'wallet') {
            // بازگرداندن نتیجه نهایی به کانترویلر
            return await this.dataSource.transaction(async (manager) => {
                // پردازش پرداخت کیف پول
                await this.processWalletPayment(manager, orderData.payment,orderData.appointment, userId, payload.tenantId)

                // ۷. تأیید نهایی رزرو
                await this.clinicCapacityService.confirmSlotReservation(
                    reservation.reservationId!,
                    orderData.order.id,
                    userId
                )

                // ۸. بازگرداندن ساختار داده مشابه پرداخت آنلاین برای فرانت‌اند
                return {
                    requiresAction: false, // چون پرداخت انجام شده، نیاز به اکشن دیگری نیست
                    actionType: 'ORDER_COMPLETED',
                    data: {
                        orderId: orderData.order.id,
                        paymentId: orderData.payment.id,
                        paymentDate: orderData.payment.createdAt,
                        amount: orderData.calculatedTotal,
                        tenantId: payload.tenantId,
                        trackingCode: orderData.order.orderCode,
                        // ارسال اطلاعات نوبت برای نمایش رسید در فرانت‌اند
                        appointment: {
                            status: orderData.appointment?.status,
                            type: orderData.appointment?.type,
                            appointmentDate: orderData.appointment?.appointmentDate
                        }
                    },
                    message: 'نوبت شما با موفقیت رزرو و پرداخت شد'
                }
            })
        }

        // پرداخت آنلاین → برگرداندن به درگاه
        return {
            requiresAction: true,
            actionType: 'ONLINE_PAYMENT_REDIRECT',
            data: {
                orderId: orderData.order.id,
                amount: orderData.calculatedTotal,
                tenantId: payload.tenantId,
                paymentId: orderData.payment.id,
                reservationId: reservation.reservationId
            }
        }
    }

    /**
     * پردازش سرویس‌های زمان‌بندی شده (تماس در زمان دلخواه)
     */
    private async handleScheduledServiceOrder(
        payload: VetClinicOrderDto,
        userId: string
    ) {
        // ۱. محاسبه زمان واقعی تماس
        let scheduledCallTime: Date
        const phoneOption = payload.phoneCallOption

        switch (phoneOption) {
            case 'min15':
                scheduledCallTime = new Date(Date.now() + 15 * 60 * 1000)
                break
            case 'min30':
                scheduledCallTime = new Date(Date.now() + 30 * 60 * 1000)
                break
            case 'hour1':
                scheduledCallTime = new Date(Date.now() + 60 * 60 * 1000)
                break
            case 'custom':
                // تبدیل زمان انتخابی کاربر
                if (payload.reservedTime?.date && payload.reservedTime?.time) {
                    const dateParts = payload.reservedTime.date.split('/').map(Number)
                    const timeParts = payload.reservedTime.time.split(':').map(Number)
                    const [jYear, jMonth, jDay] = dateParts
                    const [hours, minutes] = timeParts
                    const {gy, gm, gd} = toGregorian(jYear, jMonth, jDay)
                    scheduledCallTime = new Date(gy, gm - 1, gd, hours, minutes, 0)
                } else {
                    throw new BadRequestException('زمان تماس باید مشخص شود')
                }
                break
            default:
                throw new BadRequestException('گزینه زمان نامعتبر است')
        }

        const timeStr = `${scheduledCallTime.getHours()}:${scheduledCallTime.getMinutes().toString().padStart(2, '0')}`

        // ۲. بررسی تداخل
        const conflictCheck = await this.clinicCapacityService.checkSlotConflict(
            payload.tenantId,
            scheduledCallTime,
            timeStr
        )

        // ۳. اگر تداخل داشت → اضافه به صف
        if (conflictCheck.conflict) {
            // انجام تمام عملیات در یک تراکنش واحد برای اطمینان از یکپارچگی داده‌ها
            return await this.dataSource.transaction(async (manager) => {
                // الف) ایجاد سفارش اولیه
                const orderData = await this.createInitialOrderForInstant(payload, userId)

                // ب) اضافه کردن به صف
                const queueResult = payload.reservedTime?.date && payload.reservedTime?.time
                    ? await this.appointmentService.addToQueue(
                        payload.tenantId,
                        orderData.appointment,
                        AppointmentType.PHONE_SCHEDULED,
                        userId,
                        orderData.order.id,
                        {date: payload.reservedTime.date, time: payload.reservedTime.time}
                    )
                    : null

                if (!queueResult) {
                    throw new BadRequestException('تاریخ و زمان رزرو الزامی است');
                }

                // د) بازگرداندن ساختار استاندارد برای فرانت‌اند (مشابه حالت موفقیت‌آمیز)
                return {
                    status: 'QUEUED',
                    orderId: orderData.order.id,
                    queueNumber: queueResult.queueInfo?.queueNumber,
                    position: queueResult.queueInfo?.position,
                    estimatedWait: queueResult.queueInfo?.estimatedWaitMinutes,
                    message: 'در صف انتظار هستید. به محض آزاد شدن دکتر، به شما اطلاع داده می‌شود.'
                }
            })
        }

        // ۴. اگه تداخل نداشت → رزرو مستقیم
        return this.handleTimedServiceOrder(payload, userId)
    }

    /**
     * پردازش سرویس‌های آنی (چت، تماس فوری)
     */
    private async handleInstantServiceOrder(
        payload: VetClinicOrderDto,
        userId: string
    ) {
        // ۱. بررسی آنلاین بودن دکتر
        const vet = await this.clinicCapacityService.getVetWithCapacity(payload.tenantId)
        if (!this.clinicCapacityService.isVetOnline(vet)) {
            throw new BadRequestException('دکتر در حال حاضر آنلاین نیست')
        }


        const appointmentType = this.mapServiceTypeToAppointmentType(payload.serviceType)

        const isUserCurrentlyConsulting = await this.appointmentService.isUserBusyForVet(userId, vet.id)

        if (isUserCurrentlyConsulting) {

            throw new BadRequestException(
                'شما در حال حاضر در حال دریافت مشاوره هستید. لطفاً پس از پایان ویزیت، درخواست جدید ثبت کنید.'
            )
        }

        // این متد باید رکوردهای صف با وضعیت WAITING یا IN_PROGRESS را برای کاربر و دکتر مشخص چک کند
        const activeQueueEntry = await this.appointmentService.getUserQueueStatus(
            userId,
            payload.tenantId,
            appointmentType
        )

        if (activeQueueEntry) {
            // بررسی می‌کنیم که وضعیت کاربر چیست تا پیام مناسب بدهیم
            if (activeQueueEntry.status === QueueStatus.IN_PROGRESS) {
                throw new BadRequestException(
                    'شما در حال حاضر در حال دریافت مشاوره با این دکتر هستید. لطفاً پس از پایان ویزیت، درخواست جدید ثبت کنید.'
                )
            } else if (activeQueueEntry.status === QueueStatus.WAITING) {
                throw new BadRequestException(
                    'شما در حال حاضر در صف انتظار این دکتر قرار دارید. لطفاً منتظر بمانید.'
                )
            }

            // در غیر این صورت (اگر استتوس دیگری داشت که منطقی نیست)، همان خطای عمومی را می‌دهیم
            throw new BadRequestException('شما یک نوبت فعال برای این دکتر دارید.')
        }

        // ۲. بررسی ظرفیت
        const availability = await this.clinicCapacityService.checkAvailability(
            payload.tenantId,
            appointmentType
        )

        // ۳. اگه ظرفیت پر بود → صف
        if (!availability.available) {
            if (!payload.acceptQueue) {
                throw new BadRequestException(
                    `دکتر در حال حاضر مشغول است. ${availability.activeCount} مشاوره فعال دارد.`
                )
            }

            // اضافه به صف
            const orderData = await this.createInitialOrderForInstant(payload, userId)
            const queueResult = await this.appointmentService.addToQueue(
                payload.tenantId,
                orderData.appointment,
                appointmentType,
                userId,
                orderData.order.id
            )

            return {
                status: 'QUEUED',
                orderId: orderData.order.id,
                queueNumber: queueResult.queueInfo?.queueNumber,
                position: queueResult.queueInfo?.position,
                estimatedWait: queueResult.queueInfo?.estimatedWaitMinutes,
                message: 'در صف انتظار هستید. به محض آزاد شدن دکتر، به شما اطلاع داده می‌شود.'
            }
        }

        // ۴. ظرفیت آزاد → رزرو فوری (همین الان)
        const now = new Date()
        const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`

        // رزرو موقت (برای ۵ دقیقه)
        const reservation = await this.appointmentService.reserveSlotTemporary(
            payload.tenantId,
            this.formatJalaliDate(now).replace(/-/g, '/'),
            timeStr,
            userId
        )

        // ایجاد سفارش
        const orderData = await this.createInitialOrderForInstant(payload, userId)

        // پرداخت
        if (payload.paymentMethod === 'wallet') {

            return await this.dataSource.transaction(async (manager) => {
                await this.processWalletPayment(manager, orderData.payment,orderData.appointment, userId, payload.tenantId)

                // تأیید رزرو (اگر رزرو موقت وجود دارد)
                if (reservation.reservationId) {
                    await this.clinicCapacityService.confirmSlotReservation(
                        reservation.reservationId,
                        orderData.order.id,
                        userId
                    )
                }

                let consultation

                if (orderData.appointment.type === AppointmentType.ONLINE_CHAT) {

                    consultation = await this.createOrUpdateConsultation({
                        userId: userId,
                        tenantId: payload.tenantId,
                        petId: payload.petId,
                        orderId: orderData.order?.orderCode,
                        appointment: orderData.appointment,
                        requestStatus: ConsultationStatus.REQUEST_SENT,
                        specialty: vet?.specialty,
                    } as any);

                    await this.setConsultationToAppointment(orderData.appointment.id, consultation.id, manager)
                }

                // بازگرداندن ساختار داده مشابه پرداخت آنلاین
                return {
                    requiresAction: false,
                    actionType: 'WALLET_PAID',
                    data: {
                        orderId: orderData.order.id,
                        paymentId: orderData.payment.id,
                        paymentDate: orderData.payment.createdAt,
                        amount: orderData.calculatedTotal,
                        tenantId: payload.tenantId,
                        serviceType: orderData.appointment.type,
                        trackingCode: orderData.order?.orderCode,
                        doctor: vet?.name || vet?.ownerName,
                        specialty: vet?.specialty,
                        consultationId: consultation?.id,
                        status: 'request-sent',
                        // ارسال اطلاعات نوبت برای نمایش رسید
                        appointment: {
                            status: orderData.appointment?.status,
                            type: orderData.appointment?.type,
                            appointmentDate: orderData.appointment?.appointmentDate
                        }
                    },
                    message: 'پرداخت موفق. منتظر اتصال به دکتر...'
                }
            })
        }

        return {
            requiresAction: true,
            actionType: 'ONLINE_PAYMENT_REDIRECT',
            data: {
                orderId: orderData.order.id,
                amount: orderData.calculatedTotal,
                tenantId: payload.tenantId,
                paymentId: orderData.payment.id,
                reservationId: reservation.reservationId
            }
        }
    }

    /**
     * تبدیل serviceType رشته‌ای به AppointmentType
     */
    private mapServiceTypeToAppointmentType(serviceType: string): AppointmentType {
        switch (serviceType) {
            case 'text':
                return AppointmentType.ONLINE_CHAT;
            case 'phone-instant':
                return AppointmentType.PHONE_INSTANT;
            case 'phone-scheduled':
                return AppointmentType.PHONE_SCHEDULED;
            default:
                return AppointmentType.IN_PERSON;
        }
    }

    /**
     * پردازش پرداخت برای سرویس‌های آنی
     */
    private async processInstantPayment(
        result: { order: Order; payment: Payment; calculatedTotal: number },
        payload: VetClinicOrderDto,
        userId: string,
        appointmentType: AppointmentType
    ) {
        // اگر کیف پول → پرداخت فوری
        if (payload.paymentMethod === 'wallet') {
            return this.dataSource.transaction(async (manager) => {
                await this.processWalletPayment(manager, result.payment,result.order.appointment, userId, payload.tenantId);

                return {
                    status: 'CONFIRMED',
                    orderId: result.order.id,
                    paymentId: result.payment.id,
                    paymentStatus: PaymentStatus.PAID,
                    amount: result.payment.amount,
                    message: 'پرداخت موفق. منتظر اتصال به دکتر...',
                    redirect: '/vet/consultation/waiting'
                };
            });
        }

        // پرداخت آنلاین → برگرداندن اطلاعات به فرانت
        return {
            requiresAction: true,
            actionType: 'ONLINE_PAYMENT_REDIRECT',
            data: {
                orderId: result.order.id,
                amount: result.calculatedTotal,
                tenantId: payload.tenantId,
                paymentId: result.payment.id
            },
            message: 'برای تکمیل رزرو، پرداخت را انجام دهید.'
        };
    }

    /**
     * تنظیم timeout — اگر کاربر در مدت مشخصی مشاوره را شروع نکرد، لغو شود
     */
    private async scheduleTimeout(
        orderId: string,
        appointmentType: AppointmentType,
        userId: string,
        tenantId: string
    ): Promise<void> {
        const TIMEOUT_MINUTES = 5; // ۵ دقیقه فرصت شروع مشاوره

        try {
            // اضافه کردن job به صف Bull
            await this.smsQueue.add('vet-instant-timeout', {
                orderId,
                appointmentType,
                userId,
                tenantId,
                scheduledAt: Date.now(),
                timeoutMinutes: TIMEOUT_MINUTES
            }, {
                delay: TIMEOUT_MINUTES * 60 * 1000, // تبدیل دقیقه به میلی‌ثانیه
                removeOnComplete: true,
                removeOnFail: false,
            });

            console.log(`⏰ Timeout برای سفارش ${orderId} تنظیم شد (${TIMEOUT_MINUTES} دقیقه)`);
        } catch (error) {
            console.error('خطا در تنظیم timeout:', error);
            // این خطا نباید جلوی ادامه فرآیند را بگیرد
        }
    }

    /**
     * متدی برای ایجاد اولیه نوبت (بدون پرداخت نهایی)
     */
    private async createInitialOrder(payload: VetClinicOrderDto, userId: string) {
        return this.dataSource.transaction(async (manager) => {
            const tenantId = payload.tenantId;
            let calculatedTotal = 0;

            // محاسبه مبلغ (این بخش باید بر اساس سرویس انتخابی پیاده شود)
            // در اینجا فرض می‌کنیم مبلغ در payload موجود است یا از سرویس استخراج می‌شود
            calculatedTotal = payload.amount || 0;

            // 2️⃣ Create Order
            const order = manager.create(Order, {
                userId,
                tenantId,
                type: OrderType.APPOINTMENT, // تغییر از PRODUCT به SERVICE
                status: OrderStatus.CUSTOMER_PENDING, // وضعیت اولیه
                totalAmount: calculatedTotal,
                note: payload.notes,
                // آدرس فقط برای ویزیت در منزل لازم است
                addressId: (payload.serviceType === 'home') ? payload.addressId : null,
            } as any);

            const savedOrder = await manager.save(order);

            // 4️⃣ Create Payment Record
            const payment = manager.create(Payment, {
                tenantId,
                orderId: savedOrder.id,
                userId,
                amount: calculatedTotal,
                status: PaymentStatus.PENDING,
                method: payload.paymentMethod,
                metadata: {
                    referenceId: null,
                    serviceType: payload.serviceType, // ذخیره نوع سرویس برای ارجاع
                    reservedTime: payload.reservedTime // ذخیره زمان رزرو شده
                }
            });
            const savedPayment = await manager.save(payment);

            // --- ایجاد رکورد Appointment ---
            const appointment = await this.createAppointment(manager, order, payment, payload);


            return {order: savedOrder, payment: savedPayment, calculatedTotal, appointment};
        });
    }

    private async createInitialOrderForInstant(payload: VetClinicOrderDto, userId: string) {
        return this.dataSource.transaction(async (manager) => {
            const instantServices = ['text', 'phone-instant', 'phone-scheduled'];
            const isInstant = instantServices.includes(payload.serviceType);

            // مبلغ سرویس آنی از تنظیمات دکتر یا پیش‌فرض
            let calculatedTotal = payload.amount;

            // ── ایجاد Order ──
            const order = manager.create(Order, {
                userId,
                tenantId: payload.tenantId,
                type: OrderType.APPOINTMENT,
                status: OrderStatus.CUSTOMER_PENDING,
                totalAmount: calculatedTotal,
                note: payload.notes,
                addressId: null, // سرویس آنی آدرس نمی‌خواهد
            } as any);
            const savedOrder = await manager.save(order);

            // ── ایجاد Payment ──
            const payment = manager.create(Payment, {
                tenantId: payload.tenantId,
                orderId: savedOrder.id,
                userId,
                amount: calculatedTotal,
                status: PaymentStatus.PENDING,
                method: payload.paymentMethod,
                metadata: {
                    referenceId: null,
                    serviceType: payload.serviceType,
                    isInstantService: isInstant,
                    reservedTime: payload.reservedTime || null,
                    // برای سرویس آنی: زمان شروع = همین لحظه
                    instantStartTime: isInstant ? new Date() : null,
                }
            });
            const savedPayment = await manager.save(payment);

            // ── ایجاد Appointment ──
            const appointment = await this.createAppointment(manager, savedOrder, savedPayment, payload);

            return {order: savedOrder, appointment: appointment, payment: savedPayment, calculatedTotal};
        });
    }

    /**
     * متد اصلی برای پردازش سفارشات غیر آنلاین (کیف پول)
     */
    private async processOrderLogic(payload: VetClinicOrderDto, userId: string) {
        return this.dataSource.transaction(async (manager) => {
            const result = await this.createInitialOrder(payload, userId);
            const savedOrder = result.order;
            const savedPayment = result.payment;
            const savedAppointment=result.appointment;
            const calculatedTotal = result.calculatedTotal;

            let path = '';
            let paymentRef = '';

            if (payload.paymentMethod === 'wallet') {
                await this.processWalletPayment(manager, savedPayment,savedAppointment, userId, payload.tenantId);
                path = '/vet/reservation/success';
                paymentRef = savedPayment.id;
            }

            return {
                orderId: savedOrder.id,
                paymentId: savedPayment.id,
                status: savedPayment.status,
                amount: savedPayment.amount,
                redirect: '',
                path: path,
                code: savedOrder.id,
                ref: paymentRef,
            };
        });
    }

    /**
     * پردازش پرداخت با کیف پول
     * 1. کسر از کیف پول کاربر
     * 2. واریز کل مبلغ به صندوق پلتفرم (Platform Bank)
     * 3. محاسبه و واریز سهم پلتفرم (Petoman Wallet)
     * 4. واریز سهم فروشنده/کلینیک (Shop Wallet)
     */
    private async processWalletPayment(manager: EntityManager, payment: Payment,appointment:Appointment, userId: string, tenantId: string) {
        const totalAmount = Number(payment.amount);
        const paymentId = payment.id;

        // 1️⃣ یافتن کیف پول‌های مورد نیاز با استفاده از WalletService
        // این متد منطق پیچیده پیدا کردن کیف پول بر اساس نوع را مدیریت می‌کند
        const userWallet = await this.walletService.getWallet(
            undefined, // tenantId برای USER مهم نیست
            userId,
            WalletType.USER,
            manager
        );

        const platformBankWallet = await this.walletService.getWallet(
            undefined,
            undefined,
            WalletType.PLATFORM_BANK,
            manager
        );

        const shopWallet = await this.walletService.getWallet(
            tenantId,
            undefined,
            WalletType.SHOP,
            manager
        );

        const petomanWallet = await this.walletService.getWallet(
            undefined,
            undefined,
            WalletType.PETOMAN,
            manager
        );

        // 2️⃣ بررسی موجودی کاربر (توسط executeTransaction هم چک می‌شود، اما برای پیام خطای بهتر اینجا هم چک می‌کنیم)
        if (Number(userWallet.balance) < totalAmount) {
            throw new BadRequestException(await this.i18n.t('wallet.balance_insufficient'));
        }

        // --- مرحله 1: کسر از کیف پول کاربر (DEBIT) ---
        await this.walletService.executeTransaction(
            manager,
            userWallet,
            WalletTransactionType.DEBIT,
            totalAmount,
            await this.i18n.t('wallet.transaction_payment_note',{args:{trackingCode:String(appointment.trackingCode)}}),
            paymentId
        );

        // --- مرحله 2: واریز کل مبلغ به صندوق پلتفرم (CREDIT) ---
        await this.walletService.executeTransaction(
            manager,
            platformBankWallet,
            WalletTransactionType.CREDIT,
            totalAmount,
            await this.i18n.t('wallet.transaction_deposit_to_platform',
                {args:{trackingCode:String(appointment.trackingCode)}}),
            paymentId
        );

        // --- مرحله 3: محاسبه سهم‌ها ---
        const feeAmount = (totalAmount * this.platformFeePercent) / 100;
        const shopAmount = totalAmount - feeAmount;

        // --- مرحله 3: توزیع سهم پلتفرم (Petoman) ---
        // 3-الف: کسر سهم پتومان از صندوق پلتفرم (DEBIT از پلتفرم)
        await this.walletService.executeTransaction(
            manager,
            platformBankWallet,
            WalletTransactionType.DEBIT,
            feeAmount,
            await this.i18n.t('wallet.transaction_fee_deduction',
                {args:{trackingCode:String(appointment.trackingCode)}}),
            paymentId
        );
        // 3-ب: واریز سهم پتومان به کیف پول Petoman (CREDIT به پتومان)
        await this.walletService.executeTransaction(
            manager,
            petomanWallet,
            WalletTransactionType.CREDIT,
            feeAmount,
            await this.i18n.t('wallet.transaction_fee_credit',
                {args:{trackingCode:String(appointment.trackingCode)}}),
            paymentId
        );

        // --- مرحله 4: توزیع سهم فروشنده (Shop) ---
        // 4-الف: کسر سهم فروشنده از صندوق پلتفرم (DEBIT از پلتفرم)
        await this.walletService.executeTransaction(
            manager,
            platformBankWallet,
            WalletTransactionType.DEBIT,
            shopAmount,
            await this.i18n.t('wallet.transaction_shop_deduction',
                {args:{trackingCode:String(appointment.trackingCode)}}),
            paymentId
        );
        // 4-ب: واریز سهم فروشنده به کیف پول Shop (CREDIT به فروشنده)
        await this.walletService.executeTransaction(
            manager,
            shopWallet,
            WalletTransactionType.CREDIT,
            shopAmount,
            await this.i18n.t('wallet.transaction_shop_credit',
                {args:{trackingCode:String(appointment.trackingCode)}}),
            paymentId
        );

        // 3️⃣ نهایی کردن پرداخت
        await this.finalizePayment(manager, payment, 'WALLET', paymentId);
    }

    async getPaymentStatus(paymentId: string, userId: string) {
        const tenantId = this.tenantContext.getTenantId();
        const payment = await this.dataSource.getRepository(Payment).findOne({
            where: {id: paymentId, tenantId, userId}
        });
        if (!payment) throw new NotFoundException('Payment not found');
        return payment;
    }

    async cancelPayment(paymentId: string, userId: string) {
        return this.dataSource.transaction(async (manager) => {
            const tenantId = this.tenantContext.getTenantId();
            const payment = await manager.findOne(Payment, {
                where: {id: paymentId, tenantId, userId, status: PaymentStatus.PENDING}
            } as any);
            if (!payment) throw new NotFoundException('Pending payment not found');

            payment.status = PaymentStatus.CANCELED;
            await manager.save(payment);

            await manager.update(Order, {id: payment.orderId}, {status: OrderStatus.CUSTOMER_CANCELLED});
            return {success: true};
        });
    }

    async manualConfirmPayment(paymentId: string, referenceId?: string) {
        return this.dataSource.transaction(async (manager) => {
            const payment = await manager.findOne(Payment, {
                where: {id: paymentId, status: PaymentStatus.PENDING}
            } as any);
            if (!payment) throw new NotFoundException('Payment not found');

            payment.status = PaymentStatus.PAID;
            if (referenceId) payment.metadata = {...payment.metadata, referenceId};
            await manager.save(payment);

            await this.finalizePayment(manager, payment, 'MANUAL', referenceId);
            return {success: true};
        });
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

    // ==========================================
    // 🆕 متد کمکی: ایجاد نوبت (Appointment)
    // ==========================================
    private async createAppointment(manager: EntityManager, order: Order, payment: Payment, payload: VetClinicOrderDto) {

        const orderWithRelations = await manager.findOne(Order, {
            where: {id: order.id},
            relations: ['user', 'user.addresses', 'address'] // لود کردن آدرس‌های کاربر برای دسترسی به defaultAddress
        } as any);

        if (!orderWithRelations) {
            throw new BadRequestException('سفارش یافت نشد');
        }

        // مپ کردن نوع سرویس رشته‌ای به Enum
        let appointmentType: AppointmentType;
        const serviceType = payment.metadata?.serviceType || payload.serviceType;

        console.log('payment.metadata?.serviceType', payment.metadata?.serviceType)

        switch (serviceType) {
            case 'in-person':
                appointmentType = AppointmentType.IN_PERSON;
                break;
            case 'home':
                appointmentType = AppointmentType.HOME_VISIT;
                break;
            case 'phone-instant':
                appointmentType = AppointmentType.PHONE_INSTANT;
                break;
            case 'phone-scheduled':
                appointmentType = AppointmentType.PHONE_SCHEDULED;
                break;
            case 'text':
                appointmentType = AppointmentType.ONLINE_CHAT;
                break;
            default:
                appointmentType = AppointmentType.IN_PERSON;
        }

        // محاسبه تاریخ و زمان دقیق
        let appointmentDate: Date | null = null;
        const reservedTime = payment.metadata?.reservedTime;

        if (reservedTime && reservedTime.date && reservedTime.time) {
            // --- تبدیل تاریخ شمسی به میلادی با استفاده از jalaali-js ---
            const jDateStr = reservedTime.date; // "1404/12/09"
            const jTimeStr = reservedTime.time; // "11:30"

            // 1. جدا کردن اجزای تاریخ شمسی
            const [jYear, jMonth, jDay] = jDateStr.split('/').map(Number);

            // 2. جدا کردن اجزای زمان
            const [hours, minutes] = jTimeStr.split(':').map(Number);

            // 3. تبدیل به میلادی با استفاده از کتابخانه
            const {gy, gm, gd} = toGregorian(jYear, jMonth, jDay);

            // 4. ساخت آبجکت Date جاوااسکریپت
            // نکته: ماه در Date جاوااسکریپت از ۰ شروع می‌شود (0 = ژانویه)، پس 1 واحد از gm کم می‌کنیم
            appointmentDate = new Date(gy, gm - 1, gd, hours, minutes, 0);

            console.log('Converted Gregorian Date:', appointmentDate.toISOString());
        }

        // ایجاد آبجکت Appointment
        const appointment = manager.create(Appointment, {
            tenantId: order.tenantId,
            userId: order.userId,
            orderId: order.id,
            petId: payload.petId,
            doctorId: order.tenantId || null,

            type: appointmentType,
            status: AppointmentStatus.PENDING, // منتظر تایید کلینیک

            appointmentDate: appointmentDate,
            duration: payload.phoneCallOption || '30', // پیش‌فرض ۳۰ دقیقه
            description: order.note, // توضیحات مشکل

            // اطلاعات مالی
            finalPrice: Number(payment.amount),

            // کد رهگیری (Tracking Code)
            trackingCode: `PET-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`, // مثال: PET-456123-789

            // مدیریت آدرس برای ویزیت در منزل
            locationData: (appointmentType === AppointmentType.HOME_VISIT) ? {
                address: orderWithRelations.address || orderWithRelations.user?.defaultAddress,
                lat: order.address?.location?.lat,
                lng: order.address?.location?.lng,
            } : null,

            // فیلدهای دیگر که در انتیتی هستند اما فعلا خالی هستند
            service: serviceType || 'نوبت‌دهی عمومی', // نام سرویس
            meetingLink: null, // بعدا توسط دکتر یا سیستم پر می‌شود
            examCodeVerified: false, // پیش‌فرض
            remainingTime: null, // برای مشاوره فوری
        } as any);

        return await manager.save(appointment);
    }

    async finalizePayment(manager: EntityManager, payment: Payment, gatewayName: string, refId?: string): Promise<Appointment | null> {
        let appointment: Appointment | null = null;

        // استفاده از تراکنش برای اطمینان از یکپارچگی داده‌ها
        await manager.transaction(async (transactionalEntityManager) => {

            // 4️⃣ دریافت اطلاعات سفارش (با روابط مورد نیاز)
            const order = await transactionalEntityManager.findOne(Order, {
                where: {id: payment.orderId},
                relations: ['user', 'tenant', 'transaction'] // اضافه کردن tenant برای جلوگیری از کوئری بعدی
            } as any);

            if (!order) {
                throw new Error("Order not found");
            }

            // 1. Create Transaction Record (برای همه درگاه‌ها، نه فقط کیف پول)
            if (gatewayName === 'WALLET') {
                const transaction = transactionalEntityManager.create(Transaction, {
                    gateway: gatewayName,
                    amount: payment.amount,
                    status: TransactionStatus.SUCCESS,
                    refId: refId || payment.id,
                    order: payment.orderId,
                    metadata: {type: TransactionType.VET_CLINIC_ORDER},
                } as any);
                await transactionalEntityManager.save(transaction);

                order.transaction = transaction
                await transactionalEntityManager.save(order)
            }

            // 2. Update Payment Status
            payment.status = PaymentStatus.PAID;
            await transactionalEntityManager.save(payment);
            // 3. Update Order Status via FSM
            await this.orderStateMachine.transitionOrder(
                payment.orderId,
                OrderStatus.CUSTOMER_PAID,
                transactionalEntityManager,
                'VET-CLINIC-PHARMACY',
            );

            if (order) {

                // --- ریلیشن tenant را برای خروجی لود می‌کنیم ---
                // چون در createAppointment فقط tenantId ست شده، اینجا آبجکت کامل را می‌خوانیم
                appointment = await manager.findOne(Appointment, {
                    where: {orderId: order.id},
                    relations: ['tenant'] // لود کردن اطلاعات کلینیک/دکتر
                } as any);

                if (appointment instanceof Appointment) {
                    appointment.status = AppointmentStatus.PENDING //AppointmentStatus.REQUEST_SENT
                    appointment.isPaid = true

                    await transactionalEntityManager.save(appointment);
                }

                // --- ارسال نوتیفیکیشن و پیامک (غیر حیاتی، در بلاک try/catch جداگانه) ---
                try {
                    const serviceTypeText = payment.metadata?.serviceType === 'home' ? 'ویزیت در منزل' : 'ویزیت حضوری';
                    const tenantName = appointment?.tenant.name || appointment?.tenant.ownerName
                    // ارسال به کاربر
                    const customerNotifTitle = await this.i18n.t('appointment.notif.appointment_created.customer.title');
                    const customerNotifMessage = await this.i18n.t('appointment.notif.appointment_created.customer.message',
                        {
                            args: {
                                serviceType: String(serviceTypeText),
                                tenantName:String(tenantName),
                                orderCode: String(order.orderCode),
                                examCode: String(appointment?.examCode)
                            }
                        });
                    const customerSmsMessage = await this.i18n.t('appointment.notif.appointment_created.customer.sms',
                        {
                            args: {
                                amount: String(payment.amount),
                                orderCode: String(order.orderCode),
                                examCode: String(appointment?.examCode)
                            }
                        });

                    await this.sendNotificationAndSms(
                        transactionalEntityManager,
                        order.userId,
                        customerNotifTitle,
                        customerNotifMessage,
                        customerSmsMessage,
                        'VET-CLINIC-PHARMACY'
                    );

                    // ارسال به کلینیک (استفاده از order.tenant که قبلاً لود شده)
                    if (order.tenant && order.tenant.ownerUserId) {
                        const clinicOwnerNotifTitle = await this.i18n.t('appointment.notif.appointment_created.clinic.title');
                        const clinicOwnerNotifMessage = await this.i18n.t('appointment.notif.appointment_created.clinic.message',
                            {args: {serviceType: String(serviceTypeText), orderCode: String(order.orderCode)}});
                        const clinicOwnerSmsMessage = await this.i18n.t('appointment.notif.appointment_created.clinic.sms',
                            {args: {serviceType: String(serviceTypeText), orderCode: String(order.orderCode)}});

                        await this.sendNotificationAndSms(
                            transactionalEntityManager,
                            order.tenant.ownerUserId,
                            clinicOwnerNotifTitle,
                            clinicOwnerNotifMessage,
                            clinicOwnerSmsMessage,
                            'VET-CLINIC-ADMIN'
                        );
                    }
                } catch (error) {
                    // لاگ کردن خطا اما متوقف کردن فرآیند پرداخت
                    console.error('Error sending notifications:', error);
                }
            }
        });

        return appointment;
    }

    private formatJalaliDate(date: Date): string {
        const jDate = toJalaali(date.getFullYear(), date.getMonth() + 1, date.getDate());
        const year = jDate.jy;
        const month = String(jDate.jm).padStart(2, '0');
        const day = String(jDate.jd).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    async setConsultationToAppointment(appointmentId: string, consultationId: string, manager?: DataSource['manager']) {

        const repo = manager
            ? manager.getRepository(Appointment)
            : this.dataSource.getRepository(Appointment);

        const appointment = await repo.findOne({
            where: {id: appointmentId}
        });

        if (!appointment) {
            throw new NotFoundException('نوبت مورد نظر یافت نشد');
        }

        appointment.consultationId = consultationId;


        await repo.save(appointment);
    }

    async createOrUpdateConsultation(data: {
        userId: string;
        petId: string;
        tenantId: string;
        orderId: string;
        appointment: Appointment;
        specialty?: string;
    }) {
        const {userId, petId, tenantId, orderId, appointment, specialty} = data;

        // استفاده از QueryRunner برای دسترسی به ریپازیتوری‌ها بدون نیاز به تزریق مستقیم در Constructor
        const consultationRepo = this.dataSource.getRepository('Consultation');

        // بررسی وجود مشاوره با این orderId
        let consultation = await consultationRepo.findOne({
            where: {appointment: {id: appointment.id}}
        } as any);

        // اگر پیدا نشد، یک مشاوره جدید می‌سازیم
        if (!consultation) {
            consultation = consultationRepo.create({
                userId: userId,
                petId: petId,
                tenantId: tenantId,
                appointment,
                specialty: specialty,
                status: ConsultationStatus.REQUEST_SENT, // یا استفاده از Enum: ConsultationStatus.PENDING
                unreadCount: 0,
            });
        } else {
            // اگر وجود داشت، وضعیت یا اطلاعات آن را آپدیت می‌کنیم
            consultation.status = ConsultationStatus.REQUEST_SENT;
            consultation.specialty = specialty;
        }

        return await consultationRepo.save(consultation);
    }

}