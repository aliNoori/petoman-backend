import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { Animal } from './animal.entity';

@Entity('brands')
export class Brand {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    slug: string; // e.g. "royal-canin"

    @Column()
    name: string;

    @Column({ nullable: true })
    code: string;

    // --- Relation ---

    /**
     * Inverse side of the Many-to-Many relation with Animal
     */
    @ManyToMany(() => Animal, (animal) => animal.brands)
    animals: Animal[];
}