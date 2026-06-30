import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import {Category} from "../../../shared/category/category.entity";

export enum DocumentaryStatus {
    PUBLISHED = 'published',
    DRAFT = 'draft',
}
@Entity('documentaries')
export class Documentary {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 150 })
    title: string;

    @Column({ type: 'text' })
    description: string;

    @Column()
    thumbnailPreview: string;

    @Column({ nullable: true })
    videoUrl?: string;

    @Column({ nullable: true })
    videoFile?: string;

    @Column()
    duration: string;

    @Column({ type: 'simple-array', nullable: true })
    tags?: string[];

    @Column({ type: 'date' })
    publishDate: string;

    @Column({ type: 'enum', enum: DocumentaryStatus, default: DocumentaryStatus.DRAFT })
    status: DocumentaryStatus;

    @Column({ length: 60, nullable: true })
    seoTitle?: string;

    @Column({ length: 160, nullable: true })
    seoDescription?: string;

    @Column({ nullable: true })
    seoKeywords?: string;

    @Column({ length: 100, unique: true })
    slug: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => Category, { eager: true })
    @JoinColumn({ name: 'categoryId' })
    category: Category;

    @Column()
    categoryId: string;

    @Column({ type: 'int', default: 1 })
    views: number;
}