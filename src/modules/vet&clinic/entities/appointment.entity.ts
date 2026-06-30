import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    BeforeInsert,
    OneToMany, OneToOne
} from 'typeorm';
import { Tenant } from "../../../core/entities/tenant.entity";
import { User } from "../../../shared/user/entities/user.entity";
import { ApiProperty } from '@nestjs/swagger';
import { Pet } from "./pet.entity";
import {Order} from "../../../shared/order/order.entity";
import {Consultation} from "../../../socket/consultation/consultation.entity";
import {TenantReview} from "../../../shared/reviews/tenant-review.entity";

/**
 * انواع نوبت دهی - دقیقاً مطابق با فرانت‌اند
 */
export enum AppointmentType {
    IN_PERSON = 'in-person',         // ویزیت حضوری
    HOME_VISIT = 'home-visit',       // ویزیت در منزل
    PHONE_INSTANT = 'urgent-consult', // مشاوره فوری (تلفنی/چت سریع)
    PHONE_SCHEDULED = 'phone',       // مشاوره تلفنی زمان‌دار
    ONLINE_CHAT = 'online',          // گفتگوی آنلاین
}

export enum AppointmentStatus {
    REQUEST_SENT = 'request_sent',
    PENDING = 'pending',             // در انتظار تایید
    CONFIRMED = 'approved',          // تایید شده
    IN_CHAT = 'in-chat',         // در حال انجام (چت/تماس)
    IN_PROGRESS='in-progress',
    COMPLETED = 'completed',         // تکمیل شده
    CANCELLED = 'cancelled',         // لغو شده
    REJECTED = 'rejected',           // رد شده
    NO_SHOW = 'no-show',             // عدم مراجعه

    QUEUED = 'queued',              // در صف انتظار
    IN_QUEUE = 'in-queue',          // در صف (جایگزین QUEUED)
    TEMP_RESERVED='temp-reserved',
    WAITING='waiting',
    EXPIRED = 'expired',            // منقضی شده (timeout)
}

@Entity('appointments')
export class Appointment {
    @ApiProperty({ example: 'uuid' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // --- Relations ---

    @ManyToOne(() => Tenant, (tenant) => tenant.appointments)
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;

    @Column()
    tenantId: string;

    @OneToMany(() => TenantReview, (tenantReview) => tenantReview.visit)
    @JoinColumn({ name: 'tenantReviewId' })
    review: TenantReview;

    @Column({nullable:true})
    tenantReviewId: string;

    // کاربری که نوبت را گرفته (صاحب حیوان)
    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column()
    userId: string;

    // کاربری که نوبت را گرفته (صاحب حیوان)
    @ManyToOne(() => Order)
    @JoinColumn({ name: 'orderId' })
    order: Order;

    @Column()
    orderId: string;

    // دامپزشک مسئول نوبت
    @ManyToOne(() => Tenant, { nullable: true })
    @JoinColumn({ name: 'doctorId' })
    doctor: Tenant;

    @Column({ nullable: true })
    doctorId: string;

    // رابطه با حیوان: هر نوبت متعلق به یک حیوان است
    @ManyToOne(() => Pet, { nullable: true, onDelete: 'SET NULL' }) // اگر حیوان حذف شد، نوبت نگه داشته شود ولی petId خالی شود
    @JoinColumn({ name: 'petId' })
    pet: Pet;

    @Column({ nullable: true })
    petId: string;

    @OneToOne(() => Consultation, (consultation) => consultation.appointment, { nullable: true })
    @JoinColumn({ name: 'consultationId' }) // نام ستون در جدول appointments
    consultation: Consultation | null;

    @Column({ nullable: true })
    consultationId: string | null;


    // --- Core Details ---

    @ApiProperty({ enum: AppointmentType })
    @Column({ type: 'enum', enum: AppointmentType })
    type: AppointmentType;

    @ApiProperty({ enum: AppointmentStatus })
    @Column({ type: 'enum', enum: AppointmentStatus, default: AppointmentStatus.REQUEST_SENT })
    status: AppointmentStatus;

    @Column({ nullable: true })
    cancelledReason: string;

    // کد رهگیری یکتا (Tracking Code) - برای نمایش به کاربر
    @Column({ unique: true, nullable: true })
    trackingCode: string;

    @Column({ unique: true, nullable: true })
    examCode: string;

    // نام سرویس یا تخصص (مثلاً واکسیناسیون، مشاوره تغذیه)
    @Column({ nullable: true })
    service: string;

    // تاریخ و زمان شروع نوبت
    @Column({ type: 'timestamp with time zone', nullable: true })
    appointmentDate?: Date;

    // مدت زمان نوبت به دقیقه
    @Column({ default: '30' ,nullable:true})
    duration?: string;

    // توضیحات مشکل یا علائم
    @Column({ type: 'text', nullable: true })
    description: string;

    // --- Logic Specific Fields ---

    // وضعیت تایید کد معاینه (مخصوص ویزیت در منزل)
    @Column({ default: false })
    examCodeVerified: boolean;

    // زمان باقی‌مانده (برای مشاوره فوری یا تلفنی فعال) - بر حسب ثانیه
    @Column({ type: 'int', nullable: true })
    remainingTime: number;

    // زمان تکمیل نوبت (برای گزارش‌گیری)
    @Column({ type: 'timestamp with time zone', nullable: true })
    completedAt?: Date;

    // --- Financial & Location ---

    // مبلغ نهایی
    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    finalPrice: number;

    @Column({ default: false })
    isPaid: boolean;

    // آدرس دقیق (برای ویزیت در منزل)
    @Column({ type: 'json', nullable: true })
    locationData: {
        address: string;
        lat: number;
        lng: number;
    };

    /**
     * _شناسه یکتای اسلات رزرو شده_
     * برای ردیابی و مدیریت همزمانی استفاده می‌شود
     */
    @ApiProperty({ example: 'SLOT-123456-abc123' })
    @Column({ nullable: true })
    slotId: string;

    /**
     * _شماره نوبت در صف انتظار_
     * اگر null باشد، یعنی در صف نیست
     */
    @ApiProperty({ example: 3 })
    @Column({ type: 'int', nullable: true })
    queueNumber: number;

    /**
     * _آیا این مشاوره هنوز فعال است؟_
     * وقتی فعال باشد، دکتر نمی‌تواند مشاوره جدیدی بپذیرد
     */
    @ApiProperty({ example: true })
    @Column({ default: false })
    isActive: boolean;

    /**
     * _زمان ورود به صف_
     * برای محاسبه مدت انتظار و timeout
     */
    @ApiProperty({ description: 'زمان ورود به صف' })
    @Column({ type: 'timestamp with time zone', nullable: true })
    joinedQueueAt: Date | null;

    /**
     * _زمان شروع واقعی مشاوره_
     * ممکن است با appointmentDate متفاوت باشد
     */
    @ApiProperty({ description: 'زمان شروع مشاوره' })
    @Column({ type: 'timestamp with time zone', nullable: true })
    startedAt: Date | null;

    /**
     * _زمان پایان مشاوره_
     */
    @ApiProperty({ description: 'زمان پایان مشاوره' })
    @Column({ type: 'timestamp with time zone', nullable: true })
    endedAt: Date | null;

    /**
     * _زمان تخمینی انتظار (به دقیقه)_
     * محاسبه می‌شود بر اساس موقعیت در صف و میانگین مدت مشاوره
     */
    @ApiProperty({ example: 10 })
    @Column({ type: 'int', nullable: true })
    estimatedWaitMinutes: number;

    /**
     * _آیا نوبت کاربر رسیده و باید شروع کند؟_
     * وقتی true شود، فرانت‌اند باید مدال شروع مشاوره را نشان دهد
     */
    @ApiProperty({ example: false })
    @Column({ default: false })
    yourTurn: boolean;

    // لینک جلسه (برای چت یا تماس)
    @Column({ nullable: true })
    meetingLink: string;

    // شناسه یکتای Peer برای برقراری تماس WebRTC
    @Column({ nullable: true })
    peerId: string;

    // --- Metadata ---

    @CreateDateColumn()
    createdAt: Date;

    // --- هوک تولید کد معاینه حرفه‌ای (Hexadecimal) ---
    @BeforeInsert()
    generateExamCode() {
        // اگر کد از قبل ست شده باشد، کاری نکن
        if (this.examCode) {
            return;
        }

        // تولید یک عدد تصادفی ۳۲ بیتی و تبدیل آن به Hex
        // این روش کدی شبیه به "a1b2c3d4" تولید می‌کند که بسیار استاندارد و حرفه‌ای است
        const randomBytes = new Uint8Array(4); // ۴ بایت = ۸ کاراکتر هگز
        crypto.getRandomValues(randomBytes); // استفاده از مولد اعداد تصادفی امن مرورگر/Node

        // تبدیل بایت‌ها به رشته Hex و حذف صفرهای اضافی از اول (padStart تضمین می‌کند ۸ کاراکتر باشد)
        this.examCode = Array.from(randomBytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
            //.toUpperCase()
            .substring(0, 8); // اطمینان از اینکه دقیقا ۸ کاراکتر است
    }

    // --- هوک تولید شناسه Peer برای تماس WebRTC ---
    @BeforeInsert()
    generatePeerId() {
        // اگر PeerId از قبل ست شده باشد، کاری نکن
        if (this.peerId) {
            return;
        }
        // تولید یک رشته تصادفی ۱۶ کاراکتری (Hex) برای PeerId
        // ۸ بایت = ۱۶ کاراکتر هگز
        const randomBytes = new Uint8Array(8);
        crypto.getRandomValues(randomBytes);

        this.peerId = Array.from(randomBytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * _هوشمند: تنظیم مقادیر پیش‌فرض برای سرویس‌های آنی_
     */
    @BeforeInsert()
    setDefaultValues() {
        // ۱. اگر سرویس آنی است و queueNumber ندارد
        const instantTypes = [
            AppointmentType.PHONE_INSTANT,
            AppointmentType.PHONE_SCHEDULED,
            AppointmentType.ONLINE_CHAT
        ];

        if (instantTypes.includes(this.type)) {
            // برای سرویس‌های آنی که بلافاصله شروع می‌شوند
            if (this.status === AppointmentStatus.REQUEST_SENT) {
                this.status = AppointmentStatus.QUEUED;
            }
        }

        // ۲. تنظیم زمان ورود به صف
        if (this.status === AppointmentStatus.QUEUED && !this.joinedQueueAt) {
            this.joinedQueueAt = new Date();
        }

        // ۳. تولید slotId اگر سرویس آنی است
        if (instantTypes.includes(this.type) && !this.slotId) {
            this.slotId = `SLOT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
    }
}