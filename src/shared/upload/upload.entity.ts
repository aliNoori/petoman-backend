// src/shared/upload/upload.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

@Entity('uploads')
export class Upload {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    filename: string

    @Column()
    url: string

    @Column()
    mimetype: string

    @CreateDateColumn()
    createdAt: Date
}
