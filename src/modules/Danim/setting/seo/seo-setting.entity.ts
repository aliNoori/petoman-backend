import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    UpdateDateColumn,
} from 'typeorm';

@Entity('danim_seo_settings')
export class DanimSeoSetting {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    key: string;

    @Column({ type: 'json', nullable: true })
    value: any;

    @UpdateDateColumn()
    updatedAt: Date;
}
