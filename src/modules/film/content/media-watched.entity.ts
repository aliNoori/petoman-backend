import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm'
import { User } from "../../../shared/user/entities/user.entity"

type MediaType = 'movie' | 'series' | 'episode'

@Entity('media_watched')
export class MediaWatched {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    mediaId: string

    @Column({ type: 'enum', enum: ['movie', 'series', 'episode'] })
    mediaType: MediaType

    // ⏱ زمان فعلی پخش (ثانیه)
    @Column({ type: 'float', default: 0 })
    currentTime: number

    // ⌛ کل مدت (ثانیه)
    @Column({ type: 'float', default: 0 })
    duration: number

    // 📊 درصد (برای query سریع / UI)
    @Column({ type: 'int', default: 0 })
    progress: number

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user: User

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date
}