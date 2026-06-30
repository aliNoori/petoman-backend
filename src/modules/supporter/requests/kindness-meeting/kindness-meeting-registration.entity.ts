import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm'
import { KindnessMeeting} from "../../kindness-meeting/kindness-meeting.entity";

export enum HelpType {
    FINANCIAL = 'financial',
    VOLUNTEER = 'volunteer',
}

@Entity('kindness_meeting_registrations')
export class KindnessMeetingRegistration {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ length: 100 })
    fullName: string

    @Column({ length: 15 })
    phone: string

    @Column({ type: 'enum', enum: HelpType })
    helpType: HelpType

    // فقط برای کمک مالی
    @Column({ type: 'bigint', nullable: true })
    amount?: number

    @Column({ type: 'text', nullable: true })
    message?: string

    /* =========================
       Relation
    ========================= */

    @ManyToOne(
        () => KindnessMeeting,
        meeting => meeting.registrations,
        { onDelete: 'CASCADE' }
    )
    @JoinColumn({ name: 'kindnessMeetingId' })
    kindnessMeeting: KindnessMeeting

    @CreateDateColumn()
    createdAt: Date
}