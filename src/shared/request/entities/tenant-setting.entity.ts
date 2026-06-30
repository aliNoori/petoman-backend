import {
    Column,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn
} from "typeorm";
import { Tenant } from "../../../core/entities/tenant.entity";

export enum SettingKey {
    CLINIC_INFO = 'clinic_info',
    VISIT_PRICING = 'visit_pricing',
    PHONE_SCHEDULE = 'phone_schedule',
}

@Entity('tenant_settings')
@Index(['tenantId', 'key']) // Index for fast lookup by tenant and key
export class TenantSetting {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    tenantId: string;

    /**
     * کلید تنظیمات برای تشخیص نوع داده
     * مقادیر مجاز:
     * - 'clinic_info': اطلاعات عمومی کلینیک (ClinicInfo)
     * - 'visit_pricing': قیمت‌گذاری انواع ویزیت (VisitPricing)
     * - 'phone_schedule': تنظیمات تماس تلفنی زمان‌دار (PhoneScheduleSettings)
     */
    @Column({
        type: 'enum',
        enum: SettingKey,
        default: SettingKey.CLINIC_INFO
    })
    key: SettingKey;

    /**
     * مقدار تنظیمات که به صورت JSON ذخیره می‌شود
     * بسته به مقدار فیلد key، ساختار این آبجکت متفاوت خواهد بود
     */
    @Column({ type: 'json' })
    value: any;

    @ManyToOne(() => Tenant, (tenant) => tenant.tenantSettings)
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}