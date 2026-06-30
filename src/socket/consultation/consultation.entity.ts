import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn, OneToOne
} from 'typeorm';
import { User } from "../../shared/user/entities/user.entity";
import { Tenant } from "../../core/entities/tenant.entity";
import { Message } from "../message/message.entity";
import {Pet} from "../../modules/vet&clinic/entities/pet.entity";
import {Appointment} from "../../modules/vet&clinic/entities/appointment.entity";

export enum ConsultationStatus {
    REQUEST_SENT = 'request-sent',       // درخواست ارسال شده
    ACTIVE = 'active',// تایید شده و در حال گفتگو
    INACTIVE = 'inactive',
    CLOSED = 'closed',                   // بسته شده
    REJECTED = 'rejected',// رد شده
    PENDING = 'pending',
    CONFIRMED='confirmed',
    COMPLETED='completed'
}
@Entity('consultations')
export class Consultation {
    @PrimaryGeneratedColumn('uuid')
    id: string; // اصلاح: تایپ باید string باشد چون uuid است

    // --- ارتباط با کاربر (User) ---
    @Column({ name: 'userId',default:null })
    userId: string; // اصلاح: معمولا ID ها در پروژه شما string هستند (طبق لاگ های قبلی)

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    // --- ارتباط با کاربر (User) ---
    @Column({ name: 'petId',default:null })
    petId: string; // اصلاح: معمولا ID ها در پروژه شما string هستند (طبق لاگ های قبلی)

    @ManyToOne(() => Pet)
    @JoinColumn({ name: 'petId' })
    pet: Pet;

    // --- ارتباط با دکتر/کلینیک (Tenant) ---
    @Column({ name: 'tenantId' })
    tenantId: string;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenantId' })
    doctor: Tenant;

    // --- ارتباط با پیام‌ها (Messages) ---
    // اصلاح: اضافه کردن OneToMany برای دریافت لیست پیام‌های این مشاوره
    // فرض بر این است که در انتیتی Message فیلد consultationId وجود دارد
    @OneToMany(() => Message, message => message.consultation)
    messages: Message[];

    // --- فیلدهای دیگر ---
    @Column({
        type: 'enum',
        enum: ConsultationStatus,
        default: ConsultationStatus.REQUEST_SENT
    })
    status: ConsultationStatus;

    @Column({
        type: 'enum',
        enum: ConsultationStatus,
        default: ConsultationStatus.REQUEST_SENT
    })
    requestStatus: ConsultationStatus;

    @Column({ nullable: true })
    specialty: string;

    @Column({ nullable: true })
    note: string;

    @Column({ nullable: true })
    review: string;

    /** Rating 1 to 5 */
    @Column('int',{default:0})
    rating: number;

    @Column({ default: 0 })
    unreadCount: number;

    @OneToOne(() => Appointment, { nullable: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'appointmentId' }) // نام ستون در جدول consultations
    appointment: Appointment | null;

    // ستون کلید خارجی را هم به صورت دستی تعریف کنید تا TypeORM گیج نشود
    @Column({ nullable: true, name: 'appointmentId' })
    appointmentId: string | null;

    // اگر نیاز دارید آخرین پیام را جداگانه ذخیره کنید (برای پرفورمنس لیست)
    // @Column({ nullable: true })
    // lastMessageContent: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}