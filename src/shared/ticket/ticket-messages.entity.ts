import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Ticket } from './ticket.entity'; // مسیر فایل تیکت اصلی

@Entity('ticket_messages')
export class TicketMessage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'ticketId' })
    ticketId: string;

    @ManyToOne(() => Ticket, ticket => ticket.messages, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'ticketId' })
    ticket: Ticket;

    @Column({ type: 'text' })
    content: string;

    @Column({ type: 'boolean', default: false })
    isAdmin: boolean; // مشخص می‌کند فرستنده ادمین است یا کاربر

    @Column({ type: 'json', nullable: true })
    attachments: string[]; // لینک فایل‌های پیوست این پیام خاص

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}