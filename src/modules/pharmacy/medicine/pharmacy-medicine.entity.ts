import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Medicine} from "../../../shared/medicine/medicine.entity";
import {Tenant} from "../../../core/entities/tenant.entity";
import {MarketProductStatus} from "../../market/product/entities/product.entity";

export enum PharmacyMedicineStatus {
    PENDING = 'pending',
    REJECTED = 'rejected',
    NEEDS_REVISION='needs_revision',
    APPROVED='approved',
    EDITED='edited'
}

@Entity('pharmacy_medicines')
export class PharmacyMedicine {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenantId',nullable:true })
    tenantId: string;

    @Column({nullable:true })
    updatedByUserId:string

    // ارتباط با Tenant (مالک محصول)
    @ManyToOne(() => Tenant, (tenant) => tenant.pharmacyMedicines, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;

    // لینک به داروی جهانی (الزامی)
    @Column({ name: 'medicineId' })
    medicineId: string;

    @ManyToOne(() => Medicine, { onDelete: 'CASCADE' }) // اگر دارو جهانی حذف شد، موجودی داروخانه هم حذف شود
    @JoinColumn({ name: 'medicineId' })
    medicine: Medicine;

    // فیلدهای مالی و انبارداری (مخصوص هر داروخانه)
    @Column({ type: 'decimal', precision: 10, scale: 2 })
    price: number;

    @Column({ default: 0 })
    stock: number;

    @Column({ default: true })
    isActive: boolean; // آیا این داروخانه این دارو را می‌فروشد؟

    @Column({ default: false })
    hasDiscount: boolean;

    @Column({ type: 'enum', enum: ['percentage', 'fixed'], nullable: true })
    discountType: 'percentage' | 'fixed';

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    discountValue: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    discountedPrice: number;

    @Column({nullable: true })
    expiryDate?:string;

    @Column({ type: 'enum', enum: PharmacyMedicineStatus, default: PharmacyMedicineStatus.PENDING })
    status: PharmacyMedicineStatus;

    @Column({default:''})
    rejectionReason?: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}