// src/auth/services/blacklist.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TokenBlacklist} from "./entities/token-blacklist.entity";
import * as crypto from 'crypto';

@Injectable()
export class BlacklistService {
    constructor(
        @InjectRepository(TokenBlacklist)
        private blacklistRepo: Repository<TokenBlacklist>,
    ) {}

    // افزودن توکن به لیست سیاه
    async addToBlacklist(token: string, expiresAt: Date): Promise<void> {
        // ایجاد هش از توکن برای ذخیره‌سازی امن‌تر و کوتاه‌تر
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        await this.blacklistRepo.save({
            tokenHash,
            expiresAt,
        });
    }

    // بررسی اینکه آیا توکن در لیست سیاه است یا خیر
    async isBlacklisted(token: string): Promise<boolean> {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const blacklisted = await this.blacklistRepo.findOne({
            where: { tokenHash },
        });

        return !!blacklisted;
    }

    // پاکسازی توکن‌های منقضی شده (می‌تواند یک Cron Job باشد)
    async cleanupExpiredTokens(): Promise<void> {
        await this.blacklistRepo.createQueryBuilder()
            .delete()
            .where('expiresAt < :now', { now: new Date() })
            .execute();
    }
}