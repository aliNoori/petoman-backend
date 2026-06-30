import {Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn} from "typeorm";

@Entity('appearance_settings')
export class AppearanceSetting {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    key: string;

    @Column({ type: 'text', nullable: true })
    value: string | null;

    @UpdateDateColumn()
    updatedAt: Date;
}