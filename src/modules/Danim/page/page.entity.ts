import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

export enum PageStatus {
    DRAFT = 'draft',
    PUBLISHED = 'published',
    SCHEDULED = 'scheduled'
}

@Entity('danim_pages')
export class DanimPage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // --- Basic Info ---
    @Column({ length: 150 })
    title: string;

    @Column({ length: 120, unique: true })
    slug: string;

    @Column({ type: 'text' })
    content: string;

    @Column({ type: 'text', nullable: true })
    excerpt?: string;

    // --- Page Options ---
    @Column({ type: 'enum', enum: PageStatus, default: PageStatus.DRAFT })
    status: PageStatus;

    @Column({ length: 50, default: 'default' })
    template: string; // default, full-width, landing, contact

    @Column({ type: 'timestamp', nullable: true })
    publishDate?: Date;

    // --- Images ---
    @Column({ nullable: true })
    image?: string;

    // --- SEO ---
    @Column({ length: 70, nullable: true })
    metaTitle?: string;

    @Column({ length: 170, nullable: true })
    metaDescription?: string;

    // --- OpenGraph ---
    @Column({ length: 100, nullable: true })
    ogTitle?: string;

    @Column({ length: 200, nullable: true })
    ogDescription?: string;

    @Column({ nullable: true })
    ogImage?: string;

    // --- Timestamps ---
    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
