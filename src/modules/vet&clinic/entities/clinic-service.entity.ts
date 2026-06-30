// src/core/entities/clinic-service.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('clinic_services')
export class ClinicService {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // کد سرویس (مثلاً visit, surgery) - برای ارتباط با دیتابیس
    @Column({ unique: true })
    value: string;

    // نام نمایشی (مثلاً ویزیت، جراحی) - برای نمایش به کاربر
    @Column()
    label: string;

    // کلاس آیکون (مثلاً ti ti-stethoscope)
    @Column({ nullable: true })
    icon: string;

    // وضعیت فعال/غیرفعال بودن سرویس
    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}