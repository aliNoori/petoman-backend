import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    UpdateDateColumn,
} from 'typeorm';

@Entity('danim_open_graph_settings')
export class DanimOpenGraphSetting {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    key: string;

    // اینجا نوع value رو JSON می‌کنیم
    @Column({ type: 'simple-json', nullable: true })
    value: Record<string, any> | null;

    @UpdateDateColumn()
    updatedAt: Date;
}