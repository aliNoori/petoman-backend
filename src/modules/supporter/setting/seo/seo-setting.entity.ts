import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    UpdateDateColumn,
} from 'typeorm';

@Entity('seo_settings')
export class SeoSetting {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    key: string;

    @Column({ type: 'json', nullable: true })
    value: any;

    @UpdateDateColumn()
    updatedAt: Date;
}
