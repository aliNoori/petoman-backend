import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable } from 'typeorm';
import { Brand } from './brand.entity';
import { Attribute } from './attribute.entity';

@Entity('animals')
export class Animal {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    slug: string; // e.g. "dog", "cat"

    @Column()
    name: string; // Persian name

    @Column({ nullable: true })
    icon: string; // Emoji or icon

    @Column({ nullable: true })
    code: string; // Short code like "D"

    // --- Relations ---

    /**
     * Many-to-Many relation with Brand
     * This will create a pivot table 'animals_brands' (or 'brands_animals')
     */
    @ManyToMany(() => Brand, (brand) => brand.animals, { cascade: true })
    @JoinTable({
        name: 'animal_brands', // نام جدول واسط
        joinColumn: {
            name: 'animalId',
            referencedColumnName: 'id'
        },
        inverseJoinColumn: {
            name: 'brandId',
            referencedColumnName: 'id'
        }
    })
    brands: Brand[];

    /**
     * Many-to-Many relation with Attribute
     * This will create a pivot table 'animal_attributes'
     */
    @ManyToMany(() => Attribute, (attribute) => attribute.animals, { cascade: true })
    @JoinTable({
        name: 'animal_attributes', // نام جدول واسط
        joinColumn: {
            name: 'animalId',
            referencedColumnName: 'id'
        },
        inverseJoinColumn: {
            name: 'attributeId',
            referencedColumnName: 'id'
        }
    })
    attributes: Attribute[];
}