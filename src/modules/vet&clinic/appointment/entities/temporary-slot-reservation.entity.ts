import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index
} from 'typeorm'

export enum ReservationStatus {
    ACTIVE = 'ACTIVE',
    CONFIRMED = 'CONFIRMED',
    EXPIRED = 'EXPIRED',
    CANCELLED = 'CANCELLED',
    CONFLICTED = 'CONFLICTED'
}

@Entity('temporary_slot_reservations')
@Index(['tenantId', 'slotDate', 'time', 'status'])
export class TemporarySlotReservation {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    tenantId: string

    @Column()
    userId: string

    @Column({ type: 'timestamp' })
    slotDate: Date

    @Column() // فرمت: "10:30"
    time: string

    @Column({ type: 'timestamp' })
    expiresAt: Date

    @Column({
        type: 'enum',
        enum: ReservationStatus,
        default: ReservationStatus.ACTIVE
    })
    status: ReservationStatus

    @Column({ nullable: true })
    orderId: string

    @CreateDateColumn()
    createdAt: Date
}