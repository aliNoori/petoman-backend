import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { AdminFaqCategory } from './admin-faqs-category.entity';

@Entity('admin_faqs')
export class AdminFaq {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 50 })
    section: string;

    @Column({ type: 'uuid' })
    categoryId: string;

    @ManyToOne(() => AdminFaqCategory)
    @JoinColumn({ name: 'categoryId' })
    category: AdminFaqCategory;

    @Column({ type: 'text' })
    question: string;

    @Column({ type: 'text' })
    answer: string;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @Column({ type: 'int', default: 0 })
    order: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

}