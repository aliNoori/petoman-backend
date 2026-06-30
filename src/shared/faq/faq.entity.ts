// file: tag.entity.ts
import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn} from 'typeorm';
import {Category} from "../category/category.entity";
import {FaqType} from "./faq-type.entity";

export enum ContentType {
    SUPPORTER = 'supporter',
    DANIM = 'danim',
    FILM = 'film',
    MOVIE='movie',
    SERIES='series',
    GENERAL='general',
    VET = 'vet',
    MARKET = 'market',
}

export enum FaqStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
}

@Entity('faqs')
export class Faq {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'int',default:1 })
    order: number;

    @Column({ type: 'text' })
    question: string;

    @Column({ type: 'text' })
    answer: string;

    @ManyToOne(() => Category, { eager: true })
    @JoinColumn({ name: 'categoryId' })
    category: Category;

    @Column({ type: 'enum', enum: FaqStatus, default: FaqStatus.ACTIVE })
    status: FaqStatus;

    @Column({nullable: true})
    color: string;

    @ManyToOne(() => FaqType, {nullable: true})
    type?: FaqType | null;

    @Column({ default: true })
    isActive: boolean;

    @Column({ nullable: true })
    contentTitle: string;

    @Column({ nullable: true })
    typeId: string;

    @Column({
        type: "enum",
        enum: ContentType,
        nullable: true
    })
    contentType: ContentType | null;
}