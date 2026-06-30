import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('comments')
export class Comment {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    author: string;

    @Column('text')
    text: string;

    @Column()
    postTitle: string;

    @Column({ type: 'int', default: 0 })
    rating: number;

    @Column({ type: 'enum', enum: ['pending', 'approved', 'rejected'], default: 'pending' })
    status: 'pending' | 'approved' | 'rejected';

    @CreateDateColumn()
    createdAt: Date;
}