import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { Animal } from './animal.entity';

@Entity('attributes')
export class Attribute {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    slug: string; // e.g. "chicken", "kitten"

    @Column()
    name: string;

    @Column()
    type: string; // e.g. "taste", "age", "weight"

    // --- Relation ---

    /**
     * Inverse side of the Many-to-Many relation with Animal
     */
    @ManyToMany(() => Animal, (animal) => animal.attributes)
    animals: Animal[];
}