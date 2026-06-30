import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import {Appointment, AppointmentType} from "../../entities/appointment.entity";
import {Order} from "../../../../shared/order/order.entity";

export enum QueueStatus {
    WAITING = 'WAITING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    EXPIRED = 'EXPIRED',
    CANCELLED = 'CANCELLED',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED='completed'
}

// ─────────────────────────────────────────
// 🔷 Type برای وضعیت‌های پایان‌یافته
// ─────────────────────────────────────────
export const RESOLVED_STATUSES: QueueStatus[] = [
    QueueStatus.APPROVED,
    QueueStatus.REJECTED,
    QueueStatus.EXPIRED,
    QueueStatus.CANCELLED,
];

export const ACTIVE_STATUSES: QueueStatus[] = [
    QueueStatus.WAITING,
    QueueStatus.IN_PROGRESS,
];

@Entity('appointment_queue')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'appointmentType', 'status'])
@Index(['userId', 'status'])
@Index(['orderId'], { unique: true })
export class AppointmentQueue {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    tenantId: string;

    @Column()
    userId: string;

    @Column({ type: 'enum', enum: AppointmentType })
    appointmentType: AppointmentType;

    @Column({ type: 'int' })
    position: number;

    @Column({ type: 'varchar', length: 255, nullable: true })
    patientName: string;

    @Column({ type: 'varchar', length: 20, nullable: true })
    patientPhone: string;

    @Column({ type: 'text', nullable: true })
    reason: string;

    @Column({ type: 'timestamp', nullable: true })
    preferredTime: Date;

    @Column({ type: 'timestamp', nullable: true })
    scheduledTime: Date;

    @Column({ type: 'timestamp', nullable: true })
    assignedAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    startedAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    resolvedAt: Date;

    @Column({ type: 'enum', enum: QueueStatus, default: QueueStatus.WAITING })
    status: QueueStatus;

    @Column({ type: 'int', default: 0 })
    estimatedWaitMinutes: number;

    @Column({ type: 'int', default: 0 })
    actualWaitMinutes: number;

    @Column({ type: 'varchar', length: 500, nullable: true })
    adminNote: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    rejectionReason: string;

    @Column({ type: 'boolean', default: false })
    notifiedUser: boolean;

    @Column({ type: 'timestamp', nullable: true })
    notifiedAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // ─────────────────────────────────────────
    // 🔷 روابط
    // ─────────────────────────────────────────
    @ManyToOne(() => Appointment)
    @JoinColumn({ name: 'appointmentId' })
    appointment: Appointment;

    @Column({ type: 'uuid'})
    appointmentId: string;

    @ManyToOne(() => Order)
    @JoinColumn({ name: 'orderId' })
    order: Order;

    @Column({ unique: true })
    orderId: string;

    // ─────────────────────────────────────────
    // 🔷 متدهای کمکی
    // ─────────────────────────────────────────

    /**
     * آیا نوبت هنوز در انتظار است؟
     */
    isWaiting(): boolean {
        return this.status === QueueStatus.WAITING;
    }

    /**
     * آیا نوبت فعال است؟
     */
    isActive(): boolean {
        return this.status === QueueStatus.IN_PROGRESS || this.status === QueueStatus.WAITING;
    }

    /**
     * آیا نوبت تمام شده است؟
     */
    isResolved(): boolean {
        return (
            this.status === QueueStatus.APPROVED ||
            this.status === QueueStatus.REJECTED ||
            this.status === QueueStatus.EXPIRED ||
            this.status === QueueStatus.CANCELLED
        );
    }

    /**
     * آیا نوبت رد شده است؟
     */
    isRejected(): boolean {
        return this.status === QueueStatus.REJECTED;
    }

    /**
     * آیا نوبت منقضی شده است؟
     */
    isExpired(): boolean {
        return this.status === QueueStatus.EXPIRED;
    }

    /**
     * محاسبه زمان انتظار واقعی
     */
    calculateActualWait(): number {
        if (!this.startedAt) {
            return Math.floor((Date.now() - this.createdAt.getTime()) / 60000);
        }
        return Math.floor((this.startedAt.getTime() - this.createdAt.getTime()) / 60000);
    }

    /**
     * محاسبه زمان سپری‌شده از ایجاد
     */
    getElapsedMinutes(): number {
        return Math.floor((Date.now() - this.createdAt.getTime()) / 60000);
    }

    /**
     * آیا باید timeout شود؟
     */
    shouldTimeout(maxWaitMinutes: number): boolean {
        return this.isWaiting() && this.getElapsedMinutes() > maxWaitMinutes;
    }
}