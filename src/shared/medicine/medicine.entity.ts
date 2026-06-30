import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import {PharmacyMedicine} from "../../modules/pharmacy/medicine/pharmacy-medicine.entity";

export enum MedicineStatus {
    PENDING = 'pending',
    REJECTED = 'rejected',
    NEEDS_REVISION='needs_revision',
    APPROVED='approved'
}
@Entity('medicines')
export class Medicine {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /** Tenant ownership */
    @Column('uuid',{nullable:true})
    tenantId: string;

    @Column()
    name: string;

    @Column({nullable:true})
    type: string;

    @Column({ unique: true })
    code: string; // کد یکتا در کل سیستم

    @Column({ nullable: true })
    category: string;

    @Column({default:null})
    categoryBreadcrumb: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ nullable: true })
    image: string;

    @Column({ type: 'json', nullable: true })
    galleryImages: string[];

    @Column({ nullable: true })
    activeIngredient: string;

    @Column({ nullable: true })
    dosageForm: string;

    @Column({ nullable: true })
    dosage: string;

    @Column({ nullable: true })
    suitableFor: string;

    @Column({ nullable: true })
    storage: string;

    @Column({ default: false })
    prescriptionRequired: boolean;

    @Column({ default: true })
    isActive: boolean; // آیا دارو در سیستم جهانی فعال است؟

    @Column({ type: 'enum', enum: MedicineStatus, default: MedicineStatus.PENDING })
    status: MedicineStatus;

    // در medicine.entity.ts
    @Column({ name: 'createdByTenantId', nullable: true })
    createdByTenantId: string;

    @Column({ name: 'createdByUserId', nullable: true })
    createdByUserId: string;

    // در medicine.entity.ts
    @Column({ default: false })
    isApproved: boolean; // وضعیت تایید توسط مدیر

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({default:''})
    rejectionReason?: string;

    // روابط
    @OneToMany(() => PharmacyMedicine, (pm) => pm.medicine)
    pharmacyMedicines: PharmacyMedicine[];
}