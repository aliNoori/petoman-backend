import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    UpdateDateColumn,
} from 'typeorm';

@Entity('danim_schema_settings')
export class DanimSchemaSetting {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    key: string;

    @Column({ type: 'simple-json', nullable: true })
    value: Record<string, any> | null;

    @UpdateDateColumn()
    updatedAt: Date;
}
