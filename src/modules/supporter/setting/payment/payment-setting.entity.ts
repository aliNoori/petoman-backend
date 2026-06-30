import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    UpdateDateColumn,
} from 'typeorm';

@Entity('payment_settings')
export class PaymentSetting {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    key: string;

    @Column({ type: 'simple-json', nullable: true })
    value: any | null; // می‌تواند string, number, boolean یا object باشد

    @UpdateDateColumn()
    updatedAt: Date;
}