import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from "typeorm";
import {Consultation} from "../consultation/consultation.entity";

@Entity()
export class Message {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({default:null})
    senderId: string;

    @Column({ nullable: true }) // برای چت خصوصی
    receiverId: string;

    @ManyToOne(() => Consultation, consultation => consultation.messages)
    @JoinColumn({ name: 'consultationId' })
    consultation: Consultation;

    @Column({ nullable: true }) // برای چت اتاق مشاوره
    consultationId: string;

    @Column({ type: 'json', nullable: true }) // برای ذخیره اطلاعات فایل
    file: any;

    @Column({ type: 'json', nullable: true }) // برای ذخیره اطلاعات فایل
    prescription: any;

    @Column('text',{default:null})
    text: string;

    @Column({default:null})
    type: string;

    @CreateDateColumn()
    sentAt: Date;

    @Column({ default: false })
    isDelivered: boolean;

    @Column({ type: 'timestamp', nullable: true })
    seenAt: Date | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

}