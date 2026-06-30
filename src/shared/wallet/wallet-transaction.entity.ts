import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    Index,
    OneToMany,
    ManyToOne,
    JoinColumn
} from "typeorm";
import {Wallet} from "./wallet.entity";

export enum WalletTransactionType {
    CREDIT = 'CREDIT', // add money
    DEBIT = 'DEBIT',   // spend money
    PENDING_CREDIT = 'PENDING_CREDIT',
    PENDING_FEE = 'PENDING_FEE',
    FEE_INCOME = 'FEE_INCOME',
    BANK_DEPOSIT = 'BANK_DEPOSIT',
    REFUND = 'REFUND',
    REFUND_OUT='REFUND_OUT',
    REFUND_IN='REFUND_IN',
    BANK_REFUND = 'BANK_REFUND',
    CANCELLED = 'CANCELLED',
    CANCEL_CREDIT='CANCEL_CREDIT',
    CANCEL_FEE='CANCEL_FEE'
}

@Entity('wallet_transactions')
@Index(['walletId']) // برای سرعت در کوئری‌های تاریخچه
export class WalletTransaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /**
     * The other wallet involved in the transaction (e.g., in transfers)
     * Useful to trace flow of money
     */
    @Column({nullable: true})
    relatedWalletId?: string;

    @Column({
        type: 'enum',
        enum: WalletTransactionType,
    })
    type: WalletTransactionType;

    /** Amount of transaction */
    @Column('decimal', {precision: 12, scale: 2})
    amount: number;

    /**
     * Balance snapshot AFTER this transaction
     * Critical for auditing and preventing calculation errors
     */
    @Column('decimal', {precision: 12, scale: 2})
    balanceAfter: number;

    /** Related payment or order ID */
    @Column({nullable: true})
    referenceId?: string;

    /** Description for audit */
    @Column()
    description: string;

    /**
     * Additional JSON data (e.g., order details, admin notes)
     */
    @Column({type: 'json', nullable: true})
    metadata?: Record<string, any>;

    @CreateDateColumn({nullable: true})
    releaseAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => Wallet, wallet => wallet.transactions, {onDelete: 'CASCADE'})
    @JoinColumn({name: 'walletId'})
    wallet: Wallet;


    @Column({nullable: false})
    walletId: string;
}