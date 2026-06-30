import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import {Category} from "../../../../shared/category/category.entity";

export enum ContentColor {
    RED = 'red',
    BLUE = 'blue',
    GREEN = 'green',
    YELLOW = 'yellow',
}



@Entity('movies')
export class Movie {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ default: 'movies' })
    type: string;


    @Column()
    title: string;

    @Column()
    titleEn: string;

    @Column({ type: 'text' })
    description: string;

    @Column()
    director: string;

    @Column()
    cast: string;

    @Column({ nullable: true })
    downloadUrl: string;

    @Column({ type: 'int' })
    duration: number;

    @Column({ default: false })
    featured: boolean;

    @Column({ type: 'float', nullable: true })
    imdbRating: number;

    @Column({ type: 'text', nullable: true })
    poster: string; // base64 string

    @Column({ default: 'draft' })
    status: string;

    @Column('text', { array: true, nullable: true })
    tags: string[];

    @Column({ nullable: true })
    trailerUrl: string;

    @Column({ nullable: true })
    videoLink: string;

    @Column({ nullable: true })
    videoQuality: string;

    @Column({ nullable: true })
    videoSourceType: string;

    @Column({ type: 'int' })
    year: number;

    @Column({ nullable: true })
    country: string;

    @Column({ nullable: true })
    language: string;

    @Column({ nullable: true })
    ageRating: string;

    @Column({ nullable: true })
    keywords: string;

    // 🔗 Relation
    @ManyToOne(() => Category, category => category.movies, {
        eager: true,
        nullable: false,
    })
    @JoinColumn({ name: 'categoryId' })
    category: Category;

    @Column()
    categoryId: string;

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date
}
