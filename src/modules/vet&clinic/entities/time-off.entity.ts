import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('time_off_blocks')
export class TimeOffBlock {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    tenantId:string

    @Column({ type: 'date' })
    date: string; // فرمت YYYY-MM-DD

    @Column({ type: 'time' })
    startTime: string; // فرمت HH:mm:ss یا HH:mm

    @Column({ type: 'time' })
    endTime: string;

    @Column({ type: 'text', nullable: true })
    note: string;

    @CreateDateColumn()
    createdAt: Date;
}