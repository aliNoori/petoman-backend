
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn
} from "typeorm";
import { Tenant } from "../../../core/entities/tenant.entity";

export enum ServiceStatus {
    ACTIVE = 'active',
    PENDING = 'pending',
    INACTIVE = 'inactive',
    REJECTED = 'rejected'
}

@Entity('vet_clinic_services')
export class VetClinicServiceEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    tenantId: string;

    @ManyToOne(() => Tenant,tenant=>tenant.tenantServices)
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;

    @Column()
    name: string;

    @Column('text', { nullable: true })
    description: string;

    @Column('bigint') // ذخیره به صورت عدد برای محاسبات دقیق
    price: number;

    @Column({
        type: 'enum',
        enum: ServiceStatus,
        default: ServiceStatus.PENDING
    })
    status: ServiceStatus;

    @Column('text', { nullable: true })
    reason?: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}