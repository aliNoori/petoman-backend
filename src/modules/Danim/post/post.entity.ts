import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn, ManyToMany, JoinTable, ManyToOne, OneToMany,
} from 'typeorm';
import {Category} from "../../../shared/category/category.entity";
import {User} from "../../../shared/user/entities/user.entity";
import {PostLike} from "./post-like.entity";

export enum PostStatus {
    DRAFT = 'draft',
    PUBLISHED = 'published',
}

@Entity('posts')
export class Post {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 150 })
    title: string;

    @Column({ length: 100, unique: true })
    slug: string;

    @Column({ type: 'text' })
    content: string;

    @Column({ type: 'text', nullable: true })
    excerpt?: string;

    @Column({ length: 70, nullable: true })
    metaTitle?: string;

    @Column({ length: 170, nullable: true })
    metaDescription?: string;

    @Column({ type: 'enum', enum: PostStatus, default: PostStatus.DRAFT })
    status: PostStatus;

    @Column({ default: false })
    showInMenu: boolean;

    @Column({ nullable: true })
    image?: string;

    @Column("simple-array", { nullable: true })
    tags?: string[];

    @Column("simple-array", { nullable: true })
    keywords?: string[];   // 👈 اضافه شد

    @Column({ nullable: true })
    ogTitle?: string;

    @Column({ nullable: true })
    ogDescription?: string;

    @Column({ nullable: true })
    ogImage?: string;

    @Column({ nullable: true })
    schemaType?: string;

    @Column({ type: 'timestamp', nullable: true })
    publishDate?: Date;

    @Column({ type: 'int', default: 0 })
    views: number;

    @Column({ type: 'int', default: 0 })
    likes: number

    @Column({ type: 'int', default: 0 })
    dislikes: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToMany(() => Category, category => category.posts)
    @JoinTable({
        name: 'posts_categories', // pivot name
        joinColumn: { name: 'postId', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'categoryId', referencedColumnName: 'id' },
    })
    categories: Category[];

    @ManyToOne(() => User, user => user.posts, { eager: true })
    author: User;

    @OneToMany(() => PostLike, like => like.post)
    likesRelations: PostLike[];

}