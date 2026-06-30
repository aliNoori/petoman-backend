import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne, OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from "typeorm";
import {WalletTransaction} from "./wallet-transaction.entity";
import {Withdrawal} from "../../modules/market/request/entities/withdrawal.entity";
import {Tenant} from "../../core/entities/tenant.entity";
import {User} from "../user/entities/user.entity";

export enum WalletType {
    USER = 'USER',           // User wallet for purchases
    SHOP = 'SHOP',           // Shop wallet for receiving sales
    PETOMAN = 'PETOMAN',      // Platform/Commission wallet
    PLATFORM_BANK = 'PLATFORM_BANK'
}

@Entity('wallets')
export class Wallet {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /** Tenant scope (Optional: Used for Shop and Petoman wallets) */
    @Column({nullable: true})
    tenantId: string;

    /** Owner user (Optional: Used only for User wallets) */
    @Column({nullable: true})
    userId: string;

    @Column({
        type: 'enum',
        enum: WalletType,
        default: WalletType.USER
    })
    type: WalletType;

    @Column('decimal', {precision: 12, scale: 2, default: 0})
    balance: number;

    @Column({
        type: 'enum',
        enum: ['ACTIVE', 'FROZEN', 'CLOSED'],
        default: 'ACTIVE'
    })
    status: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToMany(() => WalletTransaction, wt => wt.wallet, {cascade: true})
    transactions: WalletTransaction[]

    @OneToMany(() => Withdrawal, withdrawal => withdrawal.wallet)
    withdrawals: Withdrawal[];

    @ManyToOne(() => Tenant, (tenant) => tenant.wallet)
    @JoinColumn({name: 'tenantId'})
    tenant: Tenant;

    @ManyToOne(() => User, user => user.wallets)
    @JoinColumn({name: 'userId'})
    user: User;

}