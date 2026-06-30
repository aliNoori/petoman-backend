import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn, OneToMany, ManyToOne, JoinColumn,
} from 'typeorm';
import {Donation} from "../donation/donation.entity";
import {Category} from "../../../shared/category/category.entity";
import {KindnessMeetingRegistration} from "../requests/kindness-meeting/kindness-meeting-registration.entity";

export enum KindnessType {
    FINANCIAL = 'financial',
    VOLUNTEER = 'volunteer',
}

export enum KindnessStatus {
    ACTIVE = 'active',
    PENDING = 'pending',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

export enum TimerType {
    COUNTDOWN = 'countdown',
    PROGRESS = 'progress',
}

@Entity('kindness_meetings')
export class KindnessMeeting {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'enum', enum: KindnessType })
    type: KindnessType;

    @Column({ nullable: true })
    image?: string;

    @Column({ length: 150 })
    title: string;

    @Column({ type: 'text' })
    description: string;

    // مالی
    @Column({ type: 'bigint', nullable: true })
    goal?: number;

    @Column({ type: 'bigint', nullable: true })
    current?: number;

    @Column({ type: 'date', nullable: true })
    startDate?: string;

    @Column({ nullable: true })
    startTime?: string;

    @Column({ type: 'date', nullable: true })
    endDate?: string;

    @Column({ nullable: true })
    endTime?: string;

    // داوطلبانه
    @Column({ nullable: true })
    location?: string;

    @Column({ type: 'date', nullable: true })
    eventDate?: string;

    @Column({ nullable: true })
    eventTime?: string;

    // عمومی
    @Column({ length: 100 })
    manager: string;

    @Column({ type: 'enum', enum: KindnessStatus, default: KindnessStatus.PENDING })
    status: KindnessStatus;

    @Column({ default: false })
    showOnHomepage: boolean;

    @ManyToOne(() => Category, { eager: true })
    @JoinColumn({ name: 'categoryId' })
    category: Category;

    // تایمر
    @Column({ default: false })
    showTimer: boolean;

    @Column({ type: 'enum', enum: TimerType, nullable: true })
    timerType?: TimerType;

    @Column({ default: false })
    timerAlert: boolean;

    @Column({ type: 'int', nullable: true })
    alertDays?: number

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToMany(() => Donation, donation => donation.kindnessMeeting)
    donations: Donation[];

    @OneToMany(
        () => KindnessMeetingRegistration,
        reg => reg.kindnessMeeting,
    )
    registrations: KindnessMeetingRegistration[]

}
