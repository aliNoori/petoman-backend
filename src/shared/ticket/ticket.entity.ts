import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from "../user/entities/user.entity";
import { Tenant } from "../../core/entities/tenant.entity";
import { TicketMessage} from "./ticket-messages.entity";

export enum TicketStatus {
    OPEN = 'open',
    ANSWERED = 'answered', // وقتی ادمین پاسخ داد
    CLOSED = 'closed',
}

export enum TicketPriority {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
}

@Entity('tickets')
export class Ticket {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'userId' })
    userId: string;

    @Column({ name: 'tenantId' })
    tenantId: string;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column()
    department: string;

    @Column({ type: 'enum', enum: TicketPriority, default: TicketPriority.MEDIUM })
    priority: TicketPriority;

    @Column()
    subject: string;

    // حذف شد: چون پیام‌ها حالا در جدول جداگانه هستند
    // @Column({ type: 'text' })
    // message: string;

    @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.OPEN })
    status: TicketStatus;

    // این فیلد برای پیوست‌های اولیه تیکت است (اگر نیاز دارید)
    // اما معمولاً پیوست‌ها داخل خود پیام‌ها (TicketMessage) ذخیره می‌شوند
    @Column({ type: 'json', nullable: true })
    attachments: string[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    // استفاده از UpdateDateColumn برای مدیریت خودکار زمان آپدیت
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // --- Relations ---

    // یک تیکت دارای چندین پیام است
    @OneToMany(() => TicketMessage, message => message.ticket, { cascade: true })
    messages: TicketMessage[];
}