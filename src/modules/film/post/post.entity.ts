import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn, ManyToMany, JoinTable, ManyToOne, JoinColumn,
} from 'typeorm';
import {Category} from "../../../shared/category/category.entity";
import {IsString} from "class-validator";

export enum PostStatus {
    DRAFT = 'draft',
    PUBLISHED = 'published',
}

@Entity('film_posts')
export class FilmPost {
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

    @Column({ nullable: true })
    thumbnailUrl?: string;

    @Column("simple-array", { nullable: true })
    tags?: string[];

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

    @ManyToOne(() => Category, category => category.film_posts, {
        eager: true,
        nullable: true,
    })
    @JoinColumn({ name: 'categoryId'})
    category: Category;

    @Column({ default: false })
    commentsEnabled: boolean;

}