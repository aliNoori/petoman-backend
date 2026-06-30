import { Column, CreateDateColumn, Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from "typeorm";
import {User} from "../user/entities/user.entity";


@Entity('discounts')
export class Discount {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    code: string;

    @Column({ type: 'enum', enum: ['percent', 'fixed'] })
    type: 'percent' | 'fixed';

    @Column({ type: 'int' })
    value: number;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ type: 'int', nullable: true })
    minPurchase?: number;

    @Column({ type: 'int', nullable: true })
    maxDiscountAmount?: number;

    @Column({ type: 'int', nullable: true })
    usageLimit?: number;

    @Column({ type: 'int', default: 0 })
    usedCount: number;

    @Column({ type: 'timestamp', nullable: true })
    expireDate: Date;

    @Column({ default: true })
    isActive: boolean;

    // --- ارتباط با کاربر ---

    /** کاربری که این کد تخفیف را ایجاد کرده (ادمین یا سیستم) */
    @Column({ nullable: true })
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    /** لیست شناسه کاربرانی که از این کد استفاده کرده‌اند (برای جلوگیری از مصرف تکراری) */
    @Column({ type: 'simple-array', nullable: true })
    usedByUsers?: string[];

    @CreateDateColumn()
    createdAt: Date;
}