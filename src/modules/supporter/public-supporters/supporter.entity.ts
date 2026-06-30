import {
    Column,
    Entity,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    OneToOne,
    JoinColumn, OneToMany,
} from 'typeorm';
import { User} from "../../../shared/user/entities/user.entity";
import {Donation} from "../donation/donation.entity";

export enum SupporterType {
    FINANCIAL = 'financial',
    VOLUNTEER = 'volunteer',
    BOTH = 'both',
}

export enum SupporterStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
}

@Entity('supporters')
export class Supporter {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'enum', enum: SupporterType })
    type: SupporterType;

    @Column({ type: 'date' })
    joinDate: string;

    @Column({ type: 'enum', enum: SupporterStatus, default: SupporterStatus.ACTIVE })
    status: SupporterStatus;

    @Column({ type: 'bigint', nullable: true })
    initialAmount?: number;

    @Column({ type: 'text', nullable: true })
    address?: string;

    @Column({ type: 'text', nullable: true })
    notes?: string;
    @Column({ type: 'text', nullable: true })
    province?: string;

    @Column({ type: 'text', nullable: true })
    city?: string;

    @Column({ type: 'text', nullable: true })
    experience?: string;

    @Column({ type: 'text', nullable: true })
    motivation?: string;

    @Column({ default: false })
    agreement: boolean;

    @Column({ default: false })
    showInList: boolean;

    @Column({ type: 'json', nullable: true })
    socialLinks?: {
        instagram?: string;
        telegram?: string;
        linkedin?: string;
        twitter?: string;
    };

    @CreateDateColumn()
    createdAt: Date;

    @OneToOne(() => User, (user) => user.supporterProfile, { onDelete: 'CASCADE' })
    @JoinColumn()
    user: User;

    @OneToMany(() => Donation, donation => donation.supporter)
    donations: Donation[];

}