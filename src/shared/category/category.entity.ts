// src/modules/category/entities/category.entity.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    Tree,
    TreeChildren,
    TreeParent,
    Index,
    ManyToOne,
    JoinColumn, OneToMany, ManyToMany,
} from 'typeorm';
import { CategoryTypeEntity } from './category-type.entity';
import {Post} from '../../modules/Danim/post/post.entity'
import {Movie} from "../../modules/film/content/movie/movie.entity";
import {Series} from "../../modules/film/content/series/entities/series.entity";
import {FilmPost} from "../../modules/film/post/post.entity";
import {Documentary} from "../../modules/supporter/documentation/documentary.entity";
export enum ContentType {
    POST = 'post',
    NEWS = 'news',
    PRODUCT = 'product',
    MOVIE = 'movie',
    SERIES = 'series',
    BOTH = 'both',
    HAMIAN='hamian',
    DANIM='danim',
    FILM='film',
    VET='vet',
    MARKET='market'
}
@Entity('categories')
@Tree('closure-table')
export class Category {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 150 })
    title: string;

    @Index({ unique: true })
    @Column({ length: 160 })
    slug: string;

    @Column({
        type: "enum",
        enum: ContentType,
        nullable: true
    })
    contentType: ContentType | null;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ nullable: true })
    color?: string;

    @ManyToOne(() => CategoryTypeEntity, { nullable: true })
    type?: CategoryTypeEntity | null;

    @ManyToMany(() => Post, post => post.categories)
    posts: Post[];

    @OneToMany(() => FilmPost, post => post.category)
    film_posts: FilmPost[];

    @OneToMany(() => Movie, movie => movie.category)
    movies: Movie[];

    @OneToMany(() => Series, series => series.category)
    series: Series[];

    @OneToMany(() => Documentary, documentary => documentary.category)
    documents: Documentary[];

    @TreeParent()
    parent?: Category | null;

    @Column({ nullable: true })
    typeId: string;

    @TreeChildren()
    children?: Category[];

    @Column({ default: true })
    isActive: boolean;

    @Column({ type: 'int', default: 0 })
    sortOrder: number;

    @Column({ type: 'varchar', length: 100, nullable: true })
    icon?: string;


    @Column({ type: 'varchar', length: 255, nullable: true })
    logo?: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    cover?: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    deletedAt?: Date | null;
}