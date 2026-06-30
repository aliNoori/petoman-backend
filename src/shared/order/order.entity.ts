import {
    BeforeInsert,
    Column,
    CreateDateColumn,
    Entity,
    Index, JoinColumn,
    ManyToOne,
    OneToMany, OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from "typeorm";
import {OrderType} from "./order-type.enum";
import {OrderStatus} from "./order-status.enum";
import {Transaction} from "../transaction/transaction.entity";
import {Payment} from "../gateways/payments/payment.entity";
import {ProductOrderItem} from "../../modules/market/order/product-order-item.entity";
import {User} from "../user/entities/user.entity";
import {UserAddress} from "../address/address.entity";
import {Tenant} from "../../core/entities/tenant.entity";
import {TenantReview} from "../reviews/tenant-review.entity";
import {Appointment} from "../../modules/vet&clinic/entities/appointment.entity";


@Entity('orders')
@Index(['tenantId'])
@Index(['userId'])
@Index(['type'])
export class Order {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /** Tenant ownership */
    @Column('uuid',{ nullable: true })
    tenantId: string;

    /** Creator / customer */
    @Column('uuid')
    userId: string;

    /** Order domain type */
    @Column({
        type: 'enum',
        enum: OrderType,
    })
    type: OrderType;

    /** Lifecycle status */
    @Column({
        type: 'enum',
        enum: OrderStatus,
        default: OrderStatus.CART,
    })
    status: OrderStatus;

    // ✅ فیلدهای جدید برای مدیریت پرداخت مرحله‌ای
    @Column('int', { default: 0 })
    depositAmount: number; // مبلغ بیعانه پرداخت شده

    @Column('int', { default: 0 })
    remainingAmount: number; // مبلغ باقی‌مانده برای پرداخت

    /** Calculated total amount */
    @Column('int', { default: 0 })
    totalAmount: number;

    /** Optional customer note */
    @Column({ type: 'varchar', length: 500, nullable: true })
    note?: string | null;

    @Column({ type: 'json', nullable: true })
    metadata?: Record<string, any> | null;


    /** Audit */
    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToOne(() => Transaction, transaction => transaction.order)
    @JoinColumn({ name: 'transactionId' })
    transaction: Transaction

    @OneToOne(() => Payment, (payment) => payment.order)
    payment: Payment;

    @OneToMany(() => ProductOrderItem, item => item.order)
    items: ProductOrderItem[];

    @ManyToOne(() => User, user => user.orders)
    user: User;

    @ManyToOne(() => Tenant, tenant => tenant.orders)
    tenant: Tenant;

    @ManyToOne(() => UserAddress, a => a.order)
    @JoinColumn({ name: 'addressId' })
    address: UserAddress;

    @Column({ nullable: true })
    addressId:string

    @OneToMany(() => TenantReview, (tenantReview) => tenantReview.order)
    @JoinColumn({ name: 'tenantReviewId' })
    review: TenantReview;


    @ManyToOne(() => Appointment)
    @JoinColumn({ name: 'appointmentId' })
    appointment: Appointment;

    /**
     * کد یکتای سفارش (مثلا: ORD-A3B9)
     * این فیلد به صورت خودکار قبل از ذخیره سازی پر می‌شود
     */
    @Column({ type: 'varchar', length: 20, unique: true, nullable: true })
    orderCode: string;


    @BeforeInsert()
    generateOrderCode() {
        if (!this.orderCode) {
            const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
            const numbers = '0123456789';
            let result = '';

            // تولید ۸ کاراکتر با الگوی مخلوط (یک در میان)
            for (let i = 0; i < 8; i++) {
                if (i % 2 === 0) {
                    // جایگاه‌های زوج (۰، ۲، ۴، ...) -> حرف
                    result += letters.charAt(Math.floor(Math.random() * letters.length));
                } else {
                    // جایگاه‌های فرد (۱، ۳، ۵، ...) -> عدد
                    result += numbers.charAt(Math.floor(Math.random() * numbers.length));
                }
            }

            // ساخت کد نهایی (مثلا: ORD-a3B9xZ2p)
            this.orderCode = `ORD-${result}`;
        }
    }

}