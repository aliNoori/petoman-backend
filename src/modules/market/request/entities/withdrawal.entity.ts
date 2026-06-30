import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Wallet} from "../../../../shared/wallet/wallet.entity";
import { User} from "../../../../shared/user/entities/user.entity";
import {Tenant} from "../../../../core/entities/tenant.entity";

export enum WithdrawalStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    REJECTED = 'rejected',
}

@Entity('withdrawals')
export class Withdrawal {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    amount: number;

    @Column({ type: 'enum', enum: WithdrawalStatus, default: WithdrawalStatus.PENDING })
    status: WithdrawalStatus;

    @Column({ nullable: true })
    note: string;

    @Column({  nullable: true  })
    trackId:string

    // اطلاعات کارت/حساب مقصد (می‌تواند در جدول جداگانه bankCard هم باشد، اینجا برای سادگی ذخیره می‌کنیم)
    @Column()
    bankName: string;

    @Column()
    cardNumber: string; // آخرین ۴ رقم یا کامل

    @Column()
    iban: string;

    @ManyToOne(() => Wallet, wallet => wallet.withdrawals)
    @JoinColumn({ name: 'walletId' })
    wallet: Wallet;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @ManyToOne(() => Tenant,tenant=>tenant.withdrawals)
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;

    @CreateDateColumn()
    createdAt: Date;
}