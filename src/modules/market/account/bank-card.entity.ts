import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User} from "../../../shared/user/entities/user.entity";
import {Tenant} from "../../../core/entities/tenant.entity";

@Entity('bank_cards')
export class BankCard {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 16 })
    cardNumber: string; // شماره کارت ۱۶ رقمی

    @Column({ length: 26, unique: true })
    iban: string; // شماره شبا ۲۴ رقمی (بدون IR)

    @Column()
    bankName: string; // نام بانک (تشخیص داده شده)

    @Column({ default: false })
    isDefault: boolean; // آیا کارت پیش‌فرض است؟

    @Column({ default: false })
    verified: boolean; // وضعیت تایید (می‌تواند بعداً با API شبا بروزرسانی شود)

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column('uuid',{nullable:true})
    userId:string

    @ManyToOne(() => Tenant,tenant=>tenant.bankcards)
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;

    @Column('uuid',{nullable:true})
    tenantId:string

    @CreateDateColumn()
    createdAt: Date;
}