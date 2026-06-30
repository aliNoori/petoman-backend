import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    UpdateDateColumn,
} from 'typeorm';

@Entity('film_api_settings')
export class FilmApiSetting {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    key: string;

    @Column({ type: 'text', nullable: true })
    value: string | null;

    @UpdateDateColumn()
    updatedAt: Date;
}
