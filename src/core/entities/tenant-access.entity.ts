import {Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn,Index} from 'typeorm';
/**
 * ایندکس برای جستجوی سریعتر تمام فروشگاه‌هایی که یک مدیر به آن‌ها دسترسی دارد
 */
@Index(['managerId', 'isActive'])
@Entity('tenant_access')
export class TenantAccess {
    /**
     * شناسه کاربر مدیر (از سیستم اصلی / Super Admin)
     * این فیلد کلید خارجی به جدول کاربران سیستم است.
     */
    @PrimaryColumn({ type: 'uuid' })
    managerId: string;

    /**
     * شناسه فروشگاه (Tenant) که مدیر به آن دسترسی دارد
     */
    @PrimaryColumn({ type: 'uuid' })
    tenantId: string;

    /**
     * نوع دسترسی مدیر به این فروشگاه
     * مثال: 'FULL_ACCESS', 'READ_ONLY', 'FINANCIAL_AUDIT'
     * اگر سیستم شما سطوح مختلفی برای مدیران دارد، این فیلد بسیار کاربردی است.
     * اگر همه مدیران دسترسی کامل دارند، می‌توانید آن را حذف کنید یا پیش‌فرض در نظر بگیرید.
     */
    @Column({ type: 'varchar', length: 50, nullable: true })
    accessLevel: string;

    /**
     * توضیحات یا دلیل دسترسی (اختیاری)
     */
    @Column({ type: 'text', nullable: true })
    notes: string;

    /**
     * وضعیت فعال بودن این دسترسی
     * با غیرفعال کردن این فیلد، مدیر دیگر نمی‌تواند وارد فروشگاه شود
     * بدون اینکه نیاز به حذف رکورد باشد.
     */
    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

}