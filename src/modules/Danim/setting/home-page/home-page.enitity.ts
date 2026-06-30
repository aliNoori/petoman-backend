import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    UpdateDateColumn,
} from 'typeorm';

@Entity('danim_home_page_settings')
export class DanimHomePageSetting {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    key: string;

    @Column({ type: 'json'})
    value: any;

    @UpdateDateColumn()
    updatedAt: Date;
}
