// src/shared/request/entities/tenant-setting-change-request.entity.ts
import {
    Column, Entity, PrimaryGeneratedColumn,
    CreateDateColumn, ManyToOne, JoinColumn
} from "typeorm";
import { Tenant } from "../../../core/entities/tenant.entity";
import { SettingKey } from "./tenant-setting.entity"; // استفاده از Enum مشترک

export enum RequestStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
}

@Entity('tenant_setting_change_requests')
export class TenantSettingChangeRequest {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    tenantId: string;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;

    @Column({
        type: 'enum',
        enum: SettingKey
    })
    key: SettingKey;

    @Column({ type: 'json' })
    proposedValue: any; // مقدار جدید پیشنهادی

    @Column({ type: 'json', nullable: true })
    currentValue: any; // مقدار فعلی (برای نمایش به مدیر جهت مقایسه)

    @Column({
        type: 'enum',
        enum: RequestStatus,
        default: RequestStatus.PENDING
    })
    status: RequestStatus;

    @Column({ nullable: true })
    rejectionReason: string; // دلیل رد شدن درخواست

    @CreateDateColumn()
    createdAt: Date;

    // فیلدی برای ذخیره شناسه کاربری که درخواست را ثبت کرده (اختیاری)
    // @Column({ nullable: true })
    // requestedBy: string;
}