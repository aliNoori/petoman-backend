
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('tenant_specialties')
export class TenantSpecialty {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // کد تخصص (مثلاً general, surgery) - برای ارتباط با دیتابیس
    @Column({ unique: true })
    value: string;

    // نام نمایشی (مثلاً عمومی، جراحی) - برای نمایش به کاربر
    @Column()
    label: string;

    // وضعیت فعال/غیرفعال بودن تخصص
    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}