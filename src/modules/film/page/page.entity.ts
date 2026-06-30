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
}

@Entity('film_pages')
export class FilmPage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 150 })
    title: string;

    @Column({ length: 100, unique: true })
    slug: string;

    @Column({ type: 'text' })
    content: string;

    @Column({ length: 70, nullable: true })
    metaTitle?: string;

    @Column({ length: 170, nullable: true })
    metaDescription?: string;

    @Column({ type: 'enum', enum: PageStatus, default: PageStatus.DRAFT })
    status: PageStatus;

    @Column({ nullable: true })
    thumbnailUrl?: string;

    @Column({ type: 'timestamp', nullable: true })
    publishDate?: Date;

    @Column({ length: 50, default: 'default' })
    template: string; // default, full-width, landing, contact

    @Column({ default: false })
    showInMenu: boolean;

    @Column({ default: false })
    commentsEnabled: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}