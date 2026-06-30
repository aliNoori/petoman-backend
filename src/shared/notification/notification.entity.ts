import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User} from "../user/entities/user.entity";

export enum NotificationType {
    POST ='post',
    EMAIL = 'email',
    SMS = 'sms',
    PUSH = 'push',
    IN_APP = 'in_app',
}

export enum NotificationStatus {
    PENDING = 'pending',
    SENT = 'sent',
    FAILED = 'failed',
    READ = 'read',
}

@Entity()
export class Notification {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'enum', enum: NotificationType })
    type: NotificationType;

    @Column()
    title: string;

    @Column()
    message: string;

    @Column({ nullable: true })
    userId: string;

    @ManyToOne(() => User, user => user.notifications, { onDelete: 'CASCADE' })
    user: User;

    @Column({ type: 'enum', enum: NotificationStatus, default: NotificationStatus.PENDING })
    status: NotificationStatus;

    @Column({ nullable: true })
    icon: string;

    @Column({ nullable: true })
    color: string;

    @Column({ nullable: true })
    panelType: string;

    @CreateDateColumn()
    createdAt: Date;

    @Column({nullable: true})
    readAt: Date;
}