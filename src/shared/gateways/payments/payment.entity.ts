import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne, OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from "typeorm";
import {PaymentStatus} from "./payment-status-machine.enum";
import {Order} from "../../order/order.entity";
import {Transaction} from "../../transaction/transaction.entity";

@Entity('payments')
export class Payment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /** Tenant ownership */
    @Column()
    tenantId: string;

    /** Linked order */
    @Column()
    orderId: string;

    /** User who pays */
    @Column()
    userId: string;

    // ✅ فیلدهای جدید
    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    depositAmount: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    remainingAmount: number;

    /** Total payable amount */
    @Column()
    amount: number;

    /** Payment status */
    @Column({
        type: 'enum',
        enum: PaymentStatus,
        default: PaymentStatus.INIT,
    })
    status: PaymentStatus;

    /** Payment provider (future) */
    @Column({ nullable: true })
    provider?: string;

    @Column({ nullable: true })
    method?: string;

    /** External reference (gateway id, wallet tx id) */
    @Column({ nullable: true })
    referenceId?: string;

    @Column({ type: 'json', nullable: true })
    metadata?: Record<string, any> | null;

    @Column({ nullable: true })
    finalizedAt?: Date; // زمان تکمیل نهایی پرداخت

    @CreateDateColumn()
    refundedAt:Date

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToOne(() => Order,(order) => order.payment,{cascade:true})
    @JoinColumn({ name: 'orderId' })
    order: Order;

}