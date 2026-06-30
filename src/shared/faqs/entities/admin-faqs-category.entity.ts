import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('admin_faq_categories')
export class AdminFaqCategory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 50 })
    section: string; // market, pharmacy, clinic, vet

    @Column({ type: 'varchar', unique: true, length: 100 })
    key: string; // registration, products, ...

    @Column({ type: 'varchar' })
    label: string;

    @Column({ type: 'varchar', default: 'ti ti-tag' })
    icon: string;

    @Column({ type: 'varchar', default: '#06b6d4' })
    color: string;

    @Column({ type: 'boolean', default: false })
    isDefault: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}