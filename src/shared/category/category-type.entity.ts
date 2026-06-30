// src/modules/category/entities/category-type.entity.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    OneToMany,
} from 'typeorm';
import { Category } from './category.entity';

@Entity('category_types')
export class CategoryTypeEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true, length: 100 })
    name: string; // مثل 'document' یا 'video' یا 'success_story'

    @Column({ nullable: true, length: 200 })
    displayName?: string; // نام نمایشی (مثلاً "فیلم‌ها" یا "داستان‌های موفقیت")

    @Column({ default: true })
    isActive: boolean;

    @OneToMany(() => Category, (cat) => cat.type)
    categories: Category[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    deletedAt?: Date;
}