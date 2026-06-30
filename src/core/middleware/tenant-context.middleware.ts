
import {
    Injectable,
    NestMiddleware,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';
import { TenantCapability } from '../entities/tenant-capability.entity';
import {TenantCapabilityCache} from "../cache/tenant-capability.cache";
import {TenantUser} from "../entities/tenant-user.entity";
import {TenantAccess} from "../entities/tenant-access.entity";

/**
 * Loads tenant capabilities and attaches them to request
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
    constructor(private dataSource: DataSource) {}

    async use(req: Request & any, _: Response, next: NextFunction) {
        const user = req.user;

        if (!user?.tenantId) {
            return next(); // allow provisioning endpoints
            //throw new UnauthorizedException('Tenant context missing');
        }

        const tenantId = user.tenantId;

        // --- بخش جدید: ایجاد پل بین TenantAccess و TenantUser ---

        // ۱. تلاش برای پیدا کردن نقش مستقیم کاربر در TenantUser
        let tenantUserRole = await this.dataSource.getRepository(TenantUser)
            .createQueryBuilder('tu')
            .leftJoin('tu.role', 'role')
            .where('tu.tenantId = :tenantId', { tenantId })
            .andWhere('tu.userId = :userId', { userId: user.id })
            .select('role.name', 'roleName')
            .getRawOne();

        let effectiveRole = tenantUserRole?.role.name;

        // ۲. اگر نقش مستقیم وجود نداشت، چک می‌کنیم آیا مدیر از طریق TenantAccess دسترسی دارد؟
        if (!effectiveRole) {
            const hasAccess = await this.dataSource.getRepository(TenantAccess)
                .createQueryBuilder('ta')
                .where('ta.tenantId = :tenantId', { tenantId })
                .andWhere('ta.managerId = :managerId', { managerId: user.id })
                .getExists();

            // در ابتدای متد use، قبل از هر چیز:
            const sessionId = `sess_${user.id}_${Date.now()}`; // تولید یک ID منحصر به فرد برای این ورود
            req.sessionId = sessionId; // ذخیره در آبجکت درخواست برای استفاده‌های بعدی


            if (hasAccess) {
                // این همان "پل" است. مدیر دسترسی دارد، پس نقش عملیاتی "Admin" (یا نقش پیش‌فرض) به او می‌دهیم.
                // می‌توانید این نقش را از کانفیگ بخوانید یا هاردکد کنید (مثلاً 'ADMIN')
                effectiveRole = 'ADMIN';
                // می‌توانیم اینجا هم ست کنیم که مطمئن شویم وجود دارد
                req.virtualMembershipId = sessionId;
                // نکته: اینجا می‌توانید یک لاگ بزنید که نقش کاربر به صورت Session-Level به Admin ارتقا یافت.
                console.log(`User ${user.id} granted ADMIN role for Tenant ${tenantId} via TenantAccess bridge.`);
            }
        }

        // اگر هنوز هم نقشی پیدا نشد، یعنی کاربر هیچ دسترسی عملیاتی ندارد
        if (!effectiveRole) {
            // بسته به سیاست امنیتی خودتان می‌توانید خطا دهید یا اجازه دهید عبور کند (و بعداً در Guard ها بلاک شود)
            // return next(new UnauthorizedException('No operational role in this tenant'));
            return next();
        }

        // --- ادامه روند قبلی برای لود کردن Capabilities ---


        const cached = TenantCapabilityCache.get(tenantId);
        if (cached) {
            req.tenant = { id: tenantId, capabilities: cached,role: effectiveRole, };
            return next();
        }
        // fetch from DB → then cache
        //TenantCapabilityCache.set(tenantId, capabilitiesArray);

        const capabilities = await this.dataSource
            .getRepository(TenantCapability)
            .createQueryBuilder('tc')
            .leftJoin('tc.capability', 'capability')
            .where('tc.tenantId = :tenantId', { tenantId })
            .select('capability.name', 'name')
            .getRawMany();

        req.tenant = {
            id: tenantId,
            capabilities: capabilities.map((c) => c.name),
            role: effectiveRole,
        };

        next();
    }
}
