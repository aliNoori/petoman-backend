// payments/entities/transaction.entity.ts
import {
    Entity, PrimaryGeneratedColumn, Column,
    ManyToOne, CreateDateColumn, JoinColumn, OneToOne
} from 'typeorm'
import {Order} from "../order/order.entity";
import {Payment} from "../gateways/payments/payment.entity";
import {OrderStatus} from "../order/order-status.enum";

export enum TransactionStatus {
    PENDING = 'pending',
    SUCCESS = 'success',
    FAILED = 'failed',
    EXPIRED = 'expired',
    REFUNDED = 'refunded'
}

export enum TransactionType {
    MARKET_ORDER = 'MARKET_ORDER',
    VET_ORDER = 'VET_ORDER',
    CLINIC_ORDER = 'CLINIC_ORDER',
    VET_CLINIC_ORDER = 'VET_CLINIC_ORDER',
    PHARMACY_ORDER = 'PHARMACY_ORDER',
    WALLET_CHARGE = 'WALLET_CHARGE',
    REMAINING_PAYMENT = 'REMAINING_PAYMENT',
    PHARMACY_ORDER_FULLY_PAID = 'PHARMACY_ORDER_FULLY_PAID'

}

@Entity('transactions')
export class Transaction {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    gateway: string

    // ✅ فیلدهای جدید
    @Column({default: 0})
    depositAmount: number;

    @Column({default: 0})
    remainingAmount: number;

    @Column()
    amount: number

    @Column({nullable: true})
    authority?: string

    @Column({nullable: true})
    refId?: string

    @Column({default: TransactionStatus.PENDING})
    status: TransactionStatus

    // ✅ اطلاعات کمک‌کننده
    @Column({type: 'jsonb', nullable: true})
    supporterInfo?: {
        donorName?: string
        donorPhone?: string
        isAnonymous?: boolean
        acceptTerms?: boolean
        purpose?: string
        email?: string
        message?: string
        meetingId?: string
        userId?: string
    }

    @Column({type: 'jsonb', nullable: true})
    metadata?: {
        userId?: string
        tenantId?: string
        type?: TransactionType
        previousOrderStatus?: OrderStatus
        isFinalPayment?: boolean
        authorityRemaining?: string
        refIdForRemaining?: string
        finalizedAt?: Date

    }

    @OneToOne(() => Order, {onDelete: 'CASCADE'})
    @JoinColumn({name: 'orderId'})
    order: Order;

    @CreateDateColumn()
    createdAt: Date
}