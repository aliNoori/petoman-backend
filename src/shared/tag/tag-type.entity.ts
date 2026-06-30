// src/modules/tag/tag-type.entity.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    OneToMany,
} from 'typeorm';
import { Tag } from './tag.entity';

@Entity('tag_types')
export class TagType {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true, length: 100 })
    name: string; // مثل 'document' یا 'video' یا 'success_story'

    @Column({ nullable: true, length: 200 })
    displayName?: string; // نام نمایشی (مثلاً "فیلم‌ها" یا "داستان‌های موفقیت")

    @Column({ default: true })
    isActive: boolean;

    @OneToMany(() => Tag, (tag) => tag.type)
    tags: Tag[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    deletedAt?: Date;
}