import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    UpdateDateColumn,
} from 'typeorm';

@Entity('schema_settings')
export class SchemaSetting {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    key: string;

    @Column({ type: 'simple-json', nullable: true })
    value: Record<string, any> | null;

    @UpdateDateColumn()
    updatedAt: Date;
}
