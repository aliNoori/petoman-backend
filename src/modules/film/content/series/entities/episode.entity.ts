import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn} from 'typeorm';
import { Season } from './season.entity';

@Entity('episodes')
export class Episode {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'int', nullable: true })
    number?: number;

    @Column()
    title: string;

    @Column({ type: 'int', default: 0 })
    duration: number;

    @Column({ nullable: true })
    sourceType: string; // upload | external

    @Column({ nullable: true })
    quality: string; // 1080p, 720p

    @Column({ nullable: true })
    videoUrl: string;

    @Column({ default: false })
    showQualityDropdown:boolean

    @ManyToOne(() => Season, (s) => s.episodes, { onDelete: 'CASCADE' })
    season: Season;

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date
}