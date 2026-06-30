import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
} from 'typeorm'

export type ReportType =
    | 'video'
    | 'audio'
    | 'subtitle'
    | 'quality'
    | 'other'

export type MediaType = 'movie' | 'episode' | 'series'

@Entity('reports')
export class ReportEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'varchar', length: 50 })
    problemType: ReportType

    @Column({ type: 'text' })
    description: string

    @Column({ type: 'uuid' })
    mediaId: string

    @Column({ type: 'varchar', length: 20 })
    mediaType: MediaType

    @Column({ type: 'uuid', nullable: true })
    userId?: string

    @Column({ type: 'varchar', length: 20, default: 'pending' })
    status: 'pending' | 'resolved' | 'dismissed'


    @CreateDateColumn()
    createdAt: Date
}
