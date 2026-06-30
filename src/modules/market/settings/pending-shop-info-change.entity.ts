import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from "../../../core/entities/tenant.entity";

@Entity('pending_shop_info_changes')
export class PendingShopInfoChange {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // رابطه با تننت
    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;

    // ستون مربوط به کلید خارجی
    // نیازی به default: null نیست چون این فیلد الزامی است
    @Column()
    tenantId: string;

    // فقط فیلدهایی که تغییر کرده‌اند اینجا ذخیره می‌شوند
    // مثال: { "logo": "new_url.png", "address": "New Address" }
    @Column({ type: 'json' })
    changes: any;


    // توضیحات درخواست (که در سرویس با i18n پر می‌شود)
    @Column({ nullable: true })
    description: string;

    @CreateDateColumn()
    createdAt: Date;
}