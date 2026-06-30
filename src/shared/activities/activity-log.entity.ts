import {
    Entity,
    Column,
    ManyToOne,
    JoinColumn,
    Index,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn
} from 'typeorm';
import { BaseEntity } from 'typeorm';
import { User} from "../user/entities/user.entity";

export enum ActivityEntityType {
    TENANT = 'TENANT',
    ORDER = 'ORDER',
    USER = 'USER',
    WITHDRAW = 'WITHDRAW',
    REPORT = 'REPORT',
    SYSTEM = 'SYSTEM',
}

export enum ActivityAction {
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
    STATUS_CHANGE = 'STATUS_CHANGE',
    PAYMENT = 'PAYMENT',
    LOGIN = 'LOGIN',
    LOGOUT = 'LOGOUT',
    REGISTER = 'REGISTER',
}

@Entity('activity_logs')
export class ActivityLog extends BaseEntity {

    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    userId: string; // شناسه کاربری که عمل را انجام داده

    @Column({ nullable: true })
    actorName: string; // نام کاربر (برای نمایش سریع بدون جوین)

    @Column({
        type: 'enum',
        enum: ActivityEntityType,
        default: ActivityEntityType.SYSTEM
    })
    entityType: ActivityEntityType;

    @Column()
    entityId: string; // شناسه آیتم مربوطه (مثلاً ID سفارش)

    @Index()
    @Column({
        type: 'enum',
        enum: ActivityAction,
        default: ActivityAction.CREATE
    })
    action: ActivityAction;

    @Column()
    title: string; // عنوان کوتاه (مثلاً "فروشگاه جدید ثبت شد")

    @Column({ type: 'text', nullable: true })
    description: string; // توضیحات کامل

    @Column({ type: 'json', nullable: true })
    metadata: Record<string, any>; // ذخیره اطلاعات اضافه مثل مبلغ، وضعیت قبلی و جدید

    @Column({ type: 'text', nullable: true })
    ipAddress: string; // IP کاربر

    // رابطه با کاربر (اختیاری - برای جوین زدن)
    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}