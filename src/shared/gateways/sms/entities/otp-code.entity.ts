import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('otp_codes')
export class OtpCode {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 20 })
    phone: string;

    @Column()
    code: string; // هش‌شده با bcrypt

    @Column({ type: 'timestamp' })
    expiresAt: Date;

    @Column({ nullable: true })
    ipAddress?: string;

    @Column({ default: false })
    isUsed: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}