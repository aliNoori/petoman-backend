import {Entity, Column, ManyToOne, JoinColumn, BaseEntity, PrimaryGeneratedColumn} from 'typeorm';
import { Supporter} from "../public-supporters/supporter.entity";
import {KindnessMeeting} from "../kindness-meeting/kindness-meeting.entity";

export enum DonationMethod {
    CASH = 'cash',
    CARD = 'card',
    ONLINE='online',
    CHECK = 'check',
}

export enum DonationStatus {
    PENDING = 'pending',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

@Entity('donations')
export class Donation extends BaseEntity {

    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('decimal', { precision: 15, scale: 2 })
    amount: number;

    @Column({ type: 'enum', enum: DonationMethod })
    method: DonationMethod;

    @Column({ type: 'enum', enum: DonationStatus, default: DonationStatus.PENDING })
    status: DonationStatus;

    @Column({ nullable: true })
    trackingCode?: string;

    @Column({ nullable: true })
    transactionTime?: string;

    @Column({ nullable: true })
    checkNumber?: string;

    @Column({ type: 'text', nullable: true })
    note?: string;

    @ManyToOne(() => Supporter, supporter => supporter.donations, { eager: true })
    @JoinColumn()
    supporter: Supporter;

    @ManyToOne(() => KindnessMeeting, kindnessMeeting => kindnessMeeting.donations, { eager: true })
    @JoinColumn()
    kindnessMeeting: KindnessMeeting;

    @Column({ type: 'date', nullable: true })
    date?: string;

    @Column({ nullable: true })
    time?: string;
}