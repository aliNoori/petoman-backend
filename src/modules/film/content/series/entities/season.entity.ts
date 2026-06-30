import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    OneToMany,
    CreateDateColumn,
    UpdateDateColumn
} from 'typeorm';
import { Series } from './series.entity';
import { Episode } from './episode.entity';

@Entity('seasons')
export class Season {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    number: number;

    @Column()
    title: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @ManyToOne(() => Series, (series) => series.seasons, { onDelete: 'CASCADE' })
    series: Series;

    @OneToMany(() => Episode, (e) => e.season, { cascade: true,onDelete: 'CASCADE', eager: true })
    episodes: Episode[];


    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date
}
