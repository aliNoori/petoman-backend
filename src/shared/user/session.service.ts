import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import {DataSource, Not} from "typeorm";
import { Session} from "./entities/session.entity";
import {BlacklistService} from "./blacklist.service";
import {JwtService} from "@nestjs/jwt";

@Injectable()
export class SessionService {
    constructor(
        @InjectDataSource() private dataSource: DataSource,
        private jwtService: JwtService, // برای دسترسی به خدمات JWT
        private blacklistService: BlacklistService, // سرویس لیست سیاه
    ) {}

    // ایجاد نشست جدید هنگام لاگین
    async createSession(userId: string, token: string, deviceInfo: any) {
        const repo = this.dataSource.getRepository(Session);
        const session = repo.create({
            userId,
            token,
            deviceName: `${deviceInfo.os} - ${deviceInfo.browser}`, // مثال: Windows - Chrome
            os: deviceInfo.os,
            ip: deviceInfo.ip,
        });
        return repo.save(session);
    }

    // دریافت لیست نشست‌های کاربر
    async getUserSessions(userId: string) {
        const repo = this.dataSource.getRepository(Session);
        return repo.find({
            where: { userId },
            order: { createdAt: 'DESC' }
        });
    }

    // حذف یک نشست خاص
    async revokeSession(sessionId: string, userId: string) {
        const repo = this.dataSource.getRepository(Session);
        const session = await repo.findOne({ where: { id: sessionId, userId } });

        if (!session) {
            throw new NotFoundException('نشست یافت نشد');
        }

        // ✅ اضافه کردن توکن به لیست سیاه قبل از حذف
        try {
            // اگر توکن شما jti ندارد، می‌توانید کل توکن را هش کنید
            // فرض می‌کنیم توکن در session.token ذخیره شده است
            await this.blacklistService.addToBlacklist(
                session.token,
                new Date(session.expiresAt || Date.now() + 1000 * 60 * 60 * 24) // یک روز دیگر
            );
        } catch (error) {
            console.warn('خطا در افزودن به لیست سیاه:', error);
        }

        await repo.remove(session);
        return { success: true };
    }

    // حذف تمام نشست‌ها به جز نشست فعلی
    async revokeAllOtherSessions(userId: string, currentToken: string) {
        const repo = this.dataSource.getRepository(Session);

        // پیدا کردن نشست‌هایی که باید حذف شوند
        const sessionsToRemove = await repo.find({
            where: {
                userId,
                token: Not(currentToken),
            },
        });

        // اضافه کردن همه آن‌ها به لیست سیاه
        for (const session of sessionsToRemove) {
            try {
                await this.blacklistService.addToBlacklist(
                    session.token,
                    new Date(session.expiresAt || Date.now() + 1000 * 60 * 60 * 24)
                );
            } catch (error) {
                console.warn('خطا در افزودن به لیست سیاه برای نشست:', session.id);
            }
        }

        // حذف فیزیکی از دیتابیس
        await repo.delete({
            userId,
            token: Not(currentToken),
        });

        return { success: true };
    }

    // حذف نشست بر اساس توکن (برای استفاده در Logout)
    async revokeSessionByToken(userId: string, token: string) {
        const repo = this.dataSource.getRepository(Session);

        const session = await repo.findOne({
            where: { userId, token }
        });

        if (!session) {
            // اگر نشست یافت نشد، شاید قبلاً منقضی شده، نیازی به خطا نیست
            return;
        }

        await repo.remove(session);
        return { success: true };
    }
}