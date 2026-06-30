import {
    Entity,
    PrimaryGeneratedColumn,
    ManyToOne,
    CreateDateColumn,
    Unique, Column,
} from 'typeorm';
import { User } from '../../../shared/user/entities/user.entity';

@Entity('media_watch_lists')
@Unique(['mediaId', 'mediaType', 'user'])
export class MediaWatchList {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    mediaId: string;

    @Column({ type: 'enum', enum: ['movie', 'series', 'episode'] })
    mediaType: 'movie' | 'series' | 'episode';

    @ManyToOne(() => User, user => user.watchListsRelations, { onDelete: 'CASCADE' })
    user: User;

    @CreateDateColumn()
    createdAt: Date;
}
