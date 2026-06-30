import {Injectable} from "@nestjs/common";
import {InjectRepository} from "@nestjs/typeorm";
import {Message} from "./message.entity";
import {In, Repository} from "typeorm";

@Injectable()
export class MessageService {
    constructor(
        @InjectRepository(Message)
        private readonly repo: Repository<Message>
    ) {}

    // --- تغییر یافته: پشتیبانی همزمان از چت خصوصی و گروهی ---
    async save(payload: {
        senderId: string;
        text: string;
        receiverId?: string;      // اختیاری برای چت خصوصی
        consultationId?: string;  // اختیاری برای چت گروهی
        file?: any;               // اضافه شده برای فایل
        isDelivered?: boolean;
    }) {
        const msg = this.repo.create({
            ...payload,
            isDelivered: payload.isDelivered ?? false,
        });
        return await this.repo.save(msg);
    }

    async getPendingMessages(userId: string): Promise<Message[]> {
        return await this.repo.find({
            where: {
                receiverId: userId,
                isDelivered: false,
            },
            order: { sentAt: 'ASC' },
        });
    }

    async markAsDelivered(messageId: string): Promise<void> {
        await this.repo.update(messageId, {
            isDelivered: true,
        } as any);
    }

    async markAsSeen(messageId: string): Promise<void> {
        await this.repo.update(messageId, {
            seenAt: new Date(),
        });
    }

    async findById(messageId: string): Promise<Message|null> {
        return await this.repo.findOne({ where: { id: messageId } });
    }

    async getSeenStatuses(messageIds: string[]): Promise<
        { messageId: string; status: 'sent' | 'delivered' | 'seen'; seenAt?: Date }[]
    > {
        const messages = await this.repo.findBy({ id: In(messageIds) });

        return messages.map(msg => {
            const status = msg.seenAt
                ? 'seen'
                : msg.isDelivered
                    ? 'delivered'
                    : 'sent';

            return {
                messageId: msg.id,
                status,
                seenAt: msg.seenAt || undefined,
            };
        });
    }

    // --- تغییر یافته: فعال‌سازی و اصلاح متد ذخیره گروهی ---
    async saveGroupMessage(payload: {
        text: string;
        senderId: string;
        senderName: string; // ذخیره نمی‌شود اما برای راحتی است
        consultationId: string;
        type:string;
        file?: any;
        prescription?:any
    }) {
        const msg = this.repo.create({
            senderId: payload.senderId,
            text: payload.text,
            type:payload.type,
            consultationId: payload.consultationId,
            file: payload.file,
            prescription:payload.prescription,
            sentAt: new Date(),
            isDelivered: true // در اتاق فرض بر تحویل فوری است
        });
        return await this.repo.save(msg);
    }

    // --- تغییر یافته: اصلاح کوئری برای گرفتن پیام‌های اتاق ---
    async getConsultationMessages(consultationId: string): Promise<Message[]> {
        return await this.repo.find({
            where: {
                consultationId: consultationId, // حالا این فیلد وجود دارد
            },
            order: { sentAt: 'ASC' },
        });
    }

    // در فایل message.service.ts

    async getPrivateHistory(userId: string, targetUserId: string): Promise<Message[]> {
        return await this.repo.find({
            where: [
                // پیام‌هایی که کاربر جاری فرستاده و طرف مقابل دریافت کرده
                {
                    senderId: userId,
                    receiverId: targetUserId,
                    consultationId: null, // مطمئن شویم پیام‌های اتاق گروهی نمی‌آیند
                },
                // پیام‌هایی که طرف مقابل فرستاده و کاربر جاری دریافت کرده
                {
                    senderId: targetUserId,
                    receiverId: userId,
                    consultationId: null,
                }
            ],
            order: { sentAt: 'ASC' }, // مرتب سازی زمانی
        } as any);
    }

    /**
     * دریافت تعداد پیام‌های خوانده نشده در یک اتاق مشاوره برای یک کاربر خاص
     * این متد پیام‌هایی را می‌شمارد که:
     * 1. مربوط به این اتاق هستند.
     * 2. توسط کاربر جاری فرستاده نشده‌اند (یعنی پیام دریافتی است).
     * 3. هنوز seenAt نخورده‌اند.
     */
    async getUnreadMessageCount(userId: string, consultationId: string): Promise<number> {
        return await this.repo.createQueryBuilder("message")
            .select("COUNT(*)", "count")
            .where("message.consultationId = :consultationId", { consultationId })
            .andWhere("message.senderId != :userId", { userId }) // فقط پیام‌های دریافتی
            .andWhere("message.seenAt IS NULL") // فقط پیام‌های خوانده نشده
            .getRawOne()
            .then(result => parseInt(result.count, 10));
    }

    /**
     * علامت‌گذاری تمام پیام‌های خوانده نشده یک اتاق به عنوان خوانده شده
     * توسط یک کاربر خاص
     */
    async markConsultationAsRead(userId: string, consultationId: string): Promise<void> {
        // آپدیت می‌کنیم: تمام پیام‌های این اتاق که:
        // 1. توسط کاربر فرستاده نشده‌اند.
        // 2. seenAt ندارند.
        // را seenAt بزنیم.
        console.log('consultationId1',consultationId)
        console.log('userId1',userId)
        await this.repo.createQueryBuilder()
            .update(Message)
            .set({ seenAt: new Date() })
            .where("consultationId = :consultationId", { consultationId })
            .andWhere("senderId != :userId", { userId })
            .andWhere("seenAt IS NULL")
            .execute();

        console.log(`✅ پیام‌های خوانده نشده مشاوره ${consultationId} توسط کاربر ${userId} به‌روز شدند.`);
    }
}