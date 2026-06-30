import {
    Column,
    Entity,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    ManyToOne,
} from 'typeorm';
import { User } from "../../../shared/user/entities/user.entity";

export enum RequestSupporterStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
}

export enum SupporterType {
    FINANCIAL = 'financial',
    VOLUNTEER = 'volunteer',
    BOTH = 'both',
}

@Entity('request_supporters')
export class RequestSupporter {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 100 })
    firstName: string;

    @Column({ length: 100 })
    lastName: string;

    @Column()
    phone: string;

    @Column()
    avatar: string;

    @Column({ nullable: true })
    email?: string;

    @Column({ type: 'enum', enum: SupporterType })
    type: SupporterType;

    @Column({ type: 'enum', enum: RequestSupporterStatus, default: RequestSupporterStatus.PENDING })
    status: RequestSupporterStatus;

    @Column({ type: 'date', nullable: true })
    joinDate?: Date;

    @Column({ type: 'bigint', nullable: true })
    initialAmount?: number;

    @Column({ type: 'text', nullable: true })
    address?: string;

    @Column({ type: 'text', nullable: true })
    notes?: string;

    @Column({ type: 'text', nullable: true })
    province?: string;

    @Column({ type: 'text', nullable: true })
    city?: string;

    @Column({ type: 'text', nullable: true })
    experience?: string;

    @Column({ type: 'text', nullable: true })
    motivation?: string;

    @Column({ default: false })
    agreement: boolean;

    @Column({ default: false })
    showInList: boolean;

    @Column({ type: 'json', nullable: true })
    socialLinks?: {
        instagram?: string;
        telegram?: string;
        linkedin?: string;
        twitter?: string;
    };

    @CreateDateColumn()
    createdAt: Date;
}