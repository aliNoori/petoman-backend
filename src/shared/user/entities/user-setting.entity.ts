import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm'
import { User } from './user.entity'

@Entity('user_settings')
export class UserSetting {
    @PrimaryGeneratedColumn('uuid')
    id: string

    /* -------- Notifications -------- */
    @Column({ default: true })
    newFilmsNotification: boolean

    @Column({ default: false })
    commentsNotification: boolean

    /* -------- Privacy -------- */
    @Column({ default: true })
    publicProfile: boolean

    @Column({ default: true })
    showFavorites: boolean

    // --- تنظیمات سفارش ---
    @Column({ default: true })
    orderNotifications: boolean;

    // --- تنظیمات تخفیف‌ها ---
    @Column({ default: true })
    discountNotifications: boolean;

    // --- تنظیمات پیامک ---
    @Column({ default: false })
    smsNotifications: boolean;

    // --- تنظیمات سفارش ---
    @Column({ default: true })
    appointmentTimeNotifications: boolean;

    // --- تنظیمات تخفیف‌ها ---
    @Column({ default: true })
    vaccinationNotifications: boolean;

    // --- تنظیمات پیامک ---
    @Column({ default: false })
    smsAppointmentNotifications: boolean;

    // --- تنظیمات خبرنامه ---
    @Column({ default: false })
    newsletter: boolean;

    /* -------- Relations -------- */
    @OneToOne(() => User, user => user.settings, { onDelete: 'CASCADE' })
    @JoinColumn()
    user: User

    @Column()
    userId: string

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date
}
