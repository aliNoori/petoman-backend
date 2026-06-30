import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToMany,
    ManyToOne,
    CreateDateColumn,
    UpdateDateColumn,
    JoinColumn,
} from 'typeorm';
import { Season } from './season.entity';
import { Category} from "../../../../../shared/category/category.entity";
import {ContentColor} from "../../movie/movie.entity";

@Entity('series')
export class Series {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ default: 'series' })
    type: string;


    @Column({
        type: 'enum',
        enum: ContentColor,
        nullable: true,
    })
    color: ContentColor;

    @Column()
    title: string;

    @Column({ nullable: true })
    titleEn: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ nullable: true })
    director: string;

    @Column({ nullable: true })
    actors: string;

    @Column({ nullable: true })
    country: string;

    @Column({ nullable: true })
    language: string;

    @ManyToOne(() => Category, (c) => c.series, { eager: true, nullable: true })
    @JoinColumn({ name: 'categoryId' })
    category?:Category| null;

    @Column({ nullable: true })
    poster: string;

    @Column({ nullable: true })
    status: string; // draft | published | upcoming

    @Column({ type: 'float', nullable: true })
    rating: number;

    @Column('text', { array: true, nullable: true })
    tags: string[];

    @Column({ type: 'int', default: 0 })
    year: number;

    @Column({ default: false })
    featured: boolean;

    @Column({ nullable: true })
    keywords: string;

    @Column({ nullable: true })
    ageRating: string;

    @OneToMany(() => Season, s => s.series, { cascade: true, eager: true })
    seasons: Season[];

    @Column({ default: false })
    published:boolean

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}