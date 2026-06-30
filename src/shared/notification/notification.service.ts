import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
    Notification,
    NotificationStatus,
} from './notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import {ChatGateway} from "../../socket/chat.gateway";

@Injectable()
export class NotificationService {
    constructor(
        private readonly chatGateway: ChatGateway,
        @InjectRepository(Notification)
        private repo: Repository<Notification>,
    ) {}

    async create(data: CreateNotificationDto) {
        console.log('data',data)
        const notif = this.repo.create(data);
        console.log('notif',notif)
        const saved = await this.repo.save(notif);
console.log('saved',saved)
        this.chatGateway.sendNotification(data.userId!, {
            id: saved.id,
            title: saved.title,
            message: saved.message,
            icon:saved.icon,
            color:saved.color,
            createdAt: saved.createdAt,
            statusLabel:data.statusLabel??'warning'
        });

        return saved;


    }

    async markAsRead(id: string) {
        return this.repo.update(id, {
            status: NotificationStatus.READ,
        });
    }

    async markAllAsRead(userId: string) {
        return this.repo.update(
            { userId },
            { status: NotificationStatus.READ },
        );
    }

    async findUserNotifications(userId: string, panelType?: string) {
        const where: any = { userId };

        if (panelType) {
            where.panelType = panelType;
        }

        return this.repo.find({
            where,
            order: { createdAt: 'DESC' },
        });
    }

    async findUnread(userId: string) {
        return this.repo.find({
            where: {
                userId,
                status: NotificationStatus.PENDING,
            },
            order: { createdAt: 'DESC' },
        });
    }

    async countUnread(userId: string) {
        return this.repo.count({
            where: {
                userId,
                status: NotificationStatus.PENDING,
            },
        });
    }

    async delete(id: string) {
        return this.repo.delete(id);
    }

    async deleteAllForUser(userId: string) {
        return this.repo.delete({ userId });
    }
}