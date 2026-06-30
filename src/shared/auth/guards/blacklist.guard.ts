import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { BlacklistService} from "../../user/blacklist.service";

@Injectable()
export class BlacklistGuard implements CanActivate {
    constructor(
        private jwtService: JwtService,
        private blacklistService: BlacklistService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);

        if (!token) {
            throw new UnauthorizedException('توکن دسترسی یافت نشد');
        }

        try {
            // 1. بررسی صحت امضای توکن (برای استخراج payload)
            //const payload = this.jwtService.verify(token);

            // 2. بررسی لیست سیاه
            const isBlacklisted = await this.blacklistService.isBlacklisted(token);

            if (isBlacklisted) {
                throw new UnauthorizedException('این توکن لغو شده است (لاگ‌اوت شده‌اید)');
            }

            return true;
        } catch (error) {
            throw new UnauthorizedException('توکن نامعتبر یا منقضی شده است');
        }
    }

    private extractTokenFromHeader(request: Request): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
}