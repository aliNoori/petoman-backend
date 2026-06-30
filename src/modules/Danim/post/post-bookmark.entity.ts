import {
    Entity,
    PrimaryGeneratedColumn,
    ManyToOne,
    CreateDateColumn,
    Unique,
} from 'typeorm';
import { Post } from './post.entity';
import { User } from '../../../shared/user/entities/user.entity';

@Entity('post_bookmarks')
@Unique(['post', 'user']) // Ensures a user cannot the same post more than once
export class PostBookmark {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Post, post => post.likesRelations, { onDelete: 'CASCADE' })
    post: Post;

    @ManyToOne(() => User, user => user.likesRelations, { onDelete: 'CASCADE' })
    user: User;

    @CreateDateColumn()
    createdAt: Date;
}
