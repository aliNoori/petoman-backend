import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    UpdateDateColumn,
} from 'typeorm';

@Entity('danim_performance_settings')
export class DanimPerformanceSetting {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    key: string;

    @Column({ type: 'json', nullable: true })
    value: any;

    @UpdateDateColumn()
    updatedAt: Date;
}
