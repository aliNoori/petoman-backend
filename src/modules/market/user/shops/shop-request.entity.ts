import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

import { User} from "../../../../shared/user/entities/user.entity";
import {TenantType} from "../../../../core/entities/tenant.entity";

// تعریف ساختار auditLog در Entity
export class AuditLog {
    acceptedAt?: Date;
    acceptedIp?: string;
    commissionAccepted?: boolean;
    contractVersion?: string;
    commissionRate?:string
    documentsStatus?: {
        degree?: string;
        ibanVerified?: boolean;
        license?: string;
        personalPhoto?:string;
        logo?:string;
        phoneVerified?: boolean;
        selfie?: string;
        video?:string;
    };
    userAgent?: string;
    userId?: string;
}

@Entity('shop_requests')
export class ShopRequest {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    shopName: string;

    @Column()
    type: TenantType;


    @Column()
    ownerName: string;

    @Column()
    phone: string;

    @Column()
    email: string;

    @Column({ type: 'json', nullable: true })
    address: any;

    @Column({ nullable: true })
    addressString?: string;

    @Column()
    province: string;

    @Column()
    city: string;

    @Column({ type: 'json', nullable: true })
    location: { lat: number; lng: number } | null;

    @Column({ type: 'simple-array', nullable: true })
    categories: string[];

    @Column()
    iban: string;

    @Column({ type: 'jsonb', nullable: true })
    auditLog?: AuditLog;

    /**
     * Stores documents with metadata (thumbnail, name, type).
     * Structure: { logo: { thumbnail: string, name: string, type: string }, ... }
     */
    @Column({ type: 'jsonb', nullable: true })
    documents: {
        logo?: { thumbnail: string; name: string; type: string };
        license?: { thumbnail: string; name: string; type: string };
        nationalId?: { thumbnail: string; name: string; type: string };
    };


    @Column({ default: 'pending' })
    status: string; // pending, approved, rejected

    @Column({default:''})
    rejectionReason?: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column('uuid')
    userId: string;
}