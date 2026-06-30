import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { User } from "./user.entity";

@Entity('user_sessions')
export class Session {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    // توکنی که برای این نشست صادر شده است (معمولاً Refresh Token)
    @Column({ unique: true })
    token: string;

    // نام دستگاه یا مرورگر (مثلاً iPhone 13 - Safari)
    @Column({ nullable: true })
    deviceName: string;

    // سیستم عامل (مثلاً iOS, Windows)
    @Column({ nullable: true })
    os: string;

    // آدرس IP
    @Column({ nullable: true })
    ip: string;

    // آیا این نشست فعلی است؟
    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @CreateDateColumn()
    expiresAt: Date;
}