import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    UpdateDateColumn,
} from 'typeorm';

@Entity('general_settings')
export class GeneralSetting {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    key: string;

    @Column({ type: 'text', nullable: true })
    value: string | null;

    @UpdateDateColumn()
    updatedAt: Date;
}
