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

@Entity('pages')
export class Page {
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

    @Column({ default: false })
    showInMenu: boolean;

    @Column({ nullable: true })
    featuredImage?: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}