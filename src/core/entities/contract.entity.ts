import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToOne,
} from 'typeorm';
import { TenantRequest} from "../../shared/request/entities/tenant-request.entity";
import { User} from "../../shared/user/entities/user.entity";
import { TenantType } from './tenant.entity'; // اگر ایندکس دارد، اصلاح کنید

export enum ContractStatus {
    DRAFT = 'draft',
    PENDING_SIGNATURE = 'pending_signature',
    SIGNED = 'signed',
    EXPIRED = 'expired',
    REJECTED = 'rejected',
    TERMINATED = 'terminated',
}

@Entity('contracts')
export class Contract {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    tenantRequestId: string;

    @OneToOne(() => TenantRequest, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tenantRequestId' })
    tenantRequest: TenantRequest;

    @Column({ type: 'uuid' })
    userId: string;

    @ManyToOne(() => User, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ type: 'jsonb', nullable: true })
    contractData: any; // شامل جزئیات قرارداد (مبلغ، مدت، شرایط و ...)

    @Column({ type: 'jsonb', nullable: true })
    signedDocuments: {
        tenantSignature?: string; // URL امضای دیجیتال یا عکس امضا
        adminSignature?: string;
    };

    @Column({
        type: 'enum',
        enum: ContractStatus,
        default: ContractStatus.DRAFT,
    })
    status: ContractStatus;

    @Column({ nullable: true })
    signedAt?: Date;

    @Column({ nullable: true })
    expiresAt?: Date;

    @Column({ nullable: true })
    rejectionReason?: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}