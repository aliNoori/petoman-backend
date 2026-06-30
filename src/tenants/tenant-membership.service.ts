import { Injectable, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TenantUser } from "../core/entities/tenant-user.entity";
import { TenantAccess } from "../core/entities/tenant-access.entity";
import {Role} from "../core/entities/role.entity"; // ایمپورت Entity جدید

@Injectable()
export class TenantMembershipService {
    constructor(private dataSource: DataSource) {}

    async assertUserInTenant(userId: string, tenantId: string,sessionId?: string) {
        // ۱. ابتدا چک می‌کنیم آیا کاربر عضو عادی (TenantUser) هست یا خیر
        let membership = await this.dataSource.getRepository(TenantUser).findOne({
            where: {
                userId,
                tenantId,
                status: 'active',
            },
        });

        // ۲. اگر عضو عادی نبود، چک می‌کنیم آیا از طریق TenantAccess (مدیر) دسترسی دارد یا خیر
        if (!membership) {
            const hasAccess = await this.dataSource.getRepository(TenantAccess)
                .createQueryBuilder('ta')
                .where('ta.tenantId = :tenantId', { tenantId })
                .andWhere('ta.managerId = :managerId', { managerId: userId })
                .andWhere('ta.isActive = :isActive', { isActive: true }) // اطمینان از فعال بودن دسترسی
                .getExists();

            if (hasAccess) {
                // اگر مدیر دسترسی داشت، یک آبجکت مجازی (Virtual Membership) می‌سازیم
                // این آبجکت باید ساختاری مشابه TenantUser داشته باشد تا بقیه کد خراب نشود.
                // ما نقش را اینجا به صورت مجازی ست می‌کنیم (فرض بر ADMIN)
                // توجه: در یک سیستم واقعی، شاید بخواهید Role را از دیتابیس لود کنید، اما اینجا برای سادگی هاردکد یا Mock می‌کنیم.

                // پیدا کردن ID نقش Admin در سیستم (اختیاری: اگر نیاز به roleId دقیق دارید)
                const adminRole = await this.dataSource.getRepository(Role).findOne({ where: { name: 'ADMIN' } });

                membership = {
                    id: sessionId || `virtual_${userId}`, // استفاده از Session ID
                    userId: userId,
                    tenantId: tenantId,
                    roleId: adminRole?.id, // یا ID واقعی نقش ادمین اگر در دیتابیس دارید
                    status: 'active',
                    // سایر فیلدهای ضروری TenantUser را اینجا می‌توانید با مقادیر پیش‌فرض پر کنید
                    shopId: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                } as any; // استفاده از 'as any' چون داریم آبجکت را دستی می‌سازیم
            }
        }

        // ۳. اگر بعد از هر دو چک، هنوز membership وجود نداشت
        if (!membership) {
            throw new ForbiddenException(
                'User is not a member of this tenant',
            );
        }

        return membership;
    }
}