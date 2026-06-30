import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from "../../user/entities/user.entity";
import { TenantType } from "../../../core/entities/tenant.entity";

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

@Entity('tenant_requests')
export class TenantRequest {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // توجه: در Entity شما tenantName تعریف شده، اما در دیتای ارسالی name هست.
    // اگر می‌خواهید نام کاربر در tenantName ذخیره شود، باید در Controller یا DTO آن را مپ کنید.
    // اینجا فرض می‌کنیم tenantName همان نام متقاضی است.
    @Column({ nullable: true })
    tenantName: string;

    @Column({ nullable: true })
    type: TenantType;

    @Column()
    name: string;

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
    services: string[];

    @Column()
    iban: string;

    // --- فیلدهای دامپزشکی ---
    @Column({ nullable: true })
    specialty?: string;

    @Column({ nullable: true, type: 'int' })
    experience?: number;

    @Column({ nullable: true })
    clinicName?: string;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ type: 'jsonb', nullable: true })
    auditLog?: AuditLog;

    // --- فیلد documents ---
    // نکته: در دیتای ارسالی فیلدهای degree, selfie, personalPhoto, video وجود دارند.
    // اگر این فیلدها نیاز به ذخیره دارند، باید در Entity نیز اضافه شوند.
    @Column({ type: 'jsonb', nullable: true })
    documents: {
        logo?: { thumbnail: string; name: string; type: string };
        license?: { thumbnail: string; name: string; type: string };
        nationalId?: { thumbnail: string; name: string; type: string };
        // فیلدهای اضافی ارسالی
        degree?: { thumbnail: string; name: string; type: string };
        personalPhoto?: { thumbnail: string; name: string; type: string };
        video?: { thumbnail: string; name: string; type: string };
    };

    @Column({ default: 'pending' })
    status: string;

    @Column({ default: '' })
    rejectionReason?: string;

    @Column({ type: 'uuid', nullable: true })
    contractId?: string;

    @Column({ type: 'varchar', nullable: true })
    contractUrl?: string;

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