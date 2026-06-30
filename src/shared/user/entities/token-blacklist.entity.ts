import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class TokenBlacklist {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // این کلید یکتای توکن (jti) یا خود توکن است
    @Column({ type: 'varchar', unique: true })
    tokenHash: string;

    // تاریخ انقضای توکن (برای پاکسازی خودکار در آینده)
    @Column({ type: 'timestamp' })
    expiresAt: Date;

    @CreateDateColumn()
    createdAt: Date;
}