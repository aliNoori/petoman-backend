// file: tag.entity.ts
import {Entity, PrimaryGeneratedColumn, Column, ManyToOne} from 'typeorm';
import {TagType} from "./tag-type.entity";

export enum ContentType {
    POST = 'post',
    NEWS = 'news',
    PRODUCT = 'product',
    MOVIE = 'movie',
    SERIES = 'series',
    BOTH = 'both',
    HAMIAN = "hamian",
    DANIM = "danim",
    FILM = "film",
    VET = "vet",
    MARKET = "market"
}


@Entity('tags')
export class Tag {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({unique: true})
    name: string;


    @Column({unique: true})
    slug: string;

    @Column({
        type: "enum",
        enum: ContentType,
        nullable: true
    })
    contentType: ContentType | null;


    @Column({nullable: true})
    description: string;

    @Column({nullable: true})
    color: string;


    @Column({default: 0})
    count: number;


    @Column({default: 'هرگز'})
    lastUsed: string;

    @ManyToOne(() => TagType, {nullable: true})
    type?: TagType | null;

    @Column({ default: true })
    isActive: boolean;

    @Column({ nullable: true })
    typeId: string;
}