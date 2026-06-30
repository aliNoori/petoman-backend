import {
    Entity,
    PrimaryGeneratedColumn,
    ManyToOne,
    CreateDateColumn,
    Unique, Column,
} from 'typeorm';
import { User } from '../../../shared/user/entities/user.entity';

@Entity('media_favorites')
@Unique(['mediaId', 'mediaType', 'user'])
export class MediaFavorite {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    mediaId: string;

    @Column({ type: 'enum', enum: ['movie', 'series', 'episode'] })
    mediaType: 'movie' | 'series' | 'episode';

    @ManyToOne(() => User, user => user.favoritesRelations, { onDelete: 'CASCADE' })
    user: User;

    @CreateDateColumn()
    createdAt: Date;
}

