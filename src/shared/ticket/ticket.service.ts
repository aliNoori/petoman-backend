import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { I18nService } from 'nestjs-i18n';
import { Ticket, TicketStatus } from "./ticket.entity";
import { TicketMessage} from "./ticket-messages.entity";
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { ReplyTicketDto } from './dto/reply-ticket.dto';

@Injectable()
export class TicketsService {
    constructor(
        @InjectRepository(Ticket)
        private ticketsRepository: Repository<Ticket>,
        // نیازی به تزریق TicketMessage Repository نیست اگر از QueryRunner استفاده کنیم
        private dataSource: DataSource,
        private i18n: I18nService,
    ) {}

    /**
     * ایجاد تیکت جدید (با ذخیره پیام اولیه)
     */
    async create(userId: string, createTicketDto: CreateTicketDto) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            // 1. ساخت تیکت
            const newTicket = queryRunner.manager.create(Ticket, {
                userId,
                tenantId: createTicketDto.tenantId,
                department: createTicketDto.department,
                priority: createTicketDto.priority,
                subject: createTicketDto.subject,
                status: TicketStatus.OPEN,
                // attachments در اینجا می‌تواند null باشد چون پیوست‌ها به پیام اولیه وصل می‌شوند
                // مگر اینکه پیوست عمومی برای تیکت داشته باشید.
            });

            const savedTicket = await queryRunner.manager.save(newTicket);

            // 2. ذخیره پیام اولیه در جدول TicketMessage
            const firstMessage = queryRunner.manager.create(TicketMessage, {
                ticketId: savedTicket.id,
                content: createTicketDto.message,
                isAdmin: false, // سازنده تیکت همیشه کاربر است
                attachments: createTicketDto.attachments || [],
            });

            await queryRunner.manager.save(firstMessage);

            await queryRunner.commitTransaction();

            // بازگرداندن تیکت به همراه پیام‌ها (برای نمایش در فرانت)
            return this.findOne(savedTicket.id, userId, 'ADMIN'); // یا نقش واقعی کاربر

        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw new BadRequestException(await this.i18n.t('tickets.CREATE_FAILED'));
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * دریافت لیست تیکت‌ها
     */
    async findAll(userRoles: any[], userId: string,tenantId?:string) {

        const isSuperAdmin = userRoles?.some((role) => role.name === 'SUPER_ADMIN');

        if (isSuperAdmin) {
            return this.ticketsRepository.find({
                relations: ['user', 'messages', 'tenant'],
                order: { createdAt: 'DESC' },
            });
        }
        return this.ticketsRepository.find({
            where: { userId,tenantId },
            relations: ['messages'], // اضافه کردن relations پیام‌ها
            order: { createdAt: 'DESC' },
        } as any);
    }

    /**
     * دریافت یک تیکت خاص
     */
    async findOne(id: string, userId: string, userRole: string) {
        const ticket = await this.ticketsRepository.findOne({
            where: { id },
            relations: ['messages', 'user'] // لود کردن پیام‌ها و کاربر
        } as any);

        if (!ticket) {
            throw new BadRequestException(await this.i18n.t('tickets.NOT_FOUND'));
        }

        if (userRole !== 'ADMIN' && ticket.userId !== userId) {
            throw new BadRequestException(await this.i18n.t('tickets.ACCESS_DENIED'));
        }

        return ticket;
    }

    /** _ارسال پاسخ (Reply) - متد جدید_ */
    async reply(ticketId: string, userId: string, userRole: string, replyTicketDto: ReplyTicketDto) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            // 1. پیدا کردن تیکت
            const ticket = await queryRunner.manager.findOne(Ticket, {
                where: { id: ticketId }
            } as any);

            if (!ticket) {
                throw new BadRequestException(await this.i18n.t('tickets.NOT_FOUND'));
            }

            // 2. چک کردن دسترسی
            if (userRole !== 'ADMIN' && ticket.userId !== userId) {
                throw new BadRequestException(await this.i18n.t('tickets.ACCESS_DENIED'));
            }
            console.log('ts',ticket.status)
            console.log('userRole',userRole)

            // --- اصلاحیه: جلوگیری از ارسال پیام در تیکت بسته شده توسط کاربر ---
            if (userRole !== 'ADMIN' && ticket.status === TicketStatus.CLOSED) {
                throw new BadRequestException(await this.i18n.t('tickets.TICKET_CLOSED'));
            }
            // -----------------------------------------------------------------------

            // 3. تعیین اینکه فرستنده ادمین است یا خیر
            const isAdminSender = userRole === 'ADMIN';

            // 4. ایجاد پیام جدید
            const newMessage = queryRunner.manager.create(TicketMessage, {
                ticketId: ticket.id,
                content: replyTicketDto.content,
                isAdmin: isAdminSender,
                attachments: replyTicketDto.attachments || [],
            });
            await queryRunner.manager.save(newMessage);

            // 5. آپدیت وضعیت تیکت بر اساس فرستنده
            if (isAdminSender) {
                ticket.status = TicketStatus.ANSWERED;
            } else {
                // اگر کاربر پاسخ داد و تیکت بسته بود، بازش کن
                // (این بخش دیگر اجرا نمی‌شود چون اگر بسته بود بالا ارور پرتاب کردیم، اما برای اطمینان باقی می‌ماند)
                if (ticket.status === TicketStatus.CLOSED) {
                    ticket.status = TicketStatus.OPEN;
                } else if (ticket.status === TicketStatus.ANSWERED) {
                    ticket.status = TicketStatus.OPEN; // یا یک وضعیت مثل PENDING_CUSTOMER_REPLY
                }
            }

            await queryRunner.manager.save(ticket);
            await queryRunner.commitTransaction();

            // بازگرداندن تیکت آپدیت شده
            return this.findOne(ticket.id, userId, userRole);
        } catch (error) {
            await queryRunner.rollbackTransaction();
            if (error instanceof BadRequestException) throw error;
            throw new BadRequestException(await this.i18n.t('tickets.REPLY_FAILED'));
        } finally {
            await queryRunner.release();
        }
    }
    /**
     * آپدیت تیکت (تغییر وضعیت و ...)
     */
    async update(id: string, updateTicketDto: UpdateTicketDto, userId: string, userRole: string) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const ticket = await queryRunner.manager.findOne(Ticket, { where: { id } } as any);
            if (!ticket) {
                throw new BadRequestException(await this.i18n.t('tickets.NOT_FOUND'));
            }

            // فقط ادمین حق تغییر وضعیت دارد
            if (updateTicketDto.status && userRole !== 'ADMIN') {
                throw new BadRequestException(await this.i18n.t('tickets.FORBIDDEN_STATUS_CHANGE'));
            }

            if (userRole !== 'ADMIN' && ticket.userId !== userId) {
                throw new BadRequestException(await this.i18n.t('tickets.ACCESS_DENIED'));
            }

            Object.assign(ticket, updateTicketDto);
            const updatedTicket = await queryRunner.manager.save(ticket);

            await queryRunner.commitTransaction();
            return updatedTicket;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException(await this.i18n.t('tickets.UPDATE_FAILED'));
        } finally {
            await queryRunner.release();
        }
    }
}