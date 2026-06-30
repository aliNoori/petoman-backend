import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource, In } from 'typeorm'; // <--- ۱. اضافه کردن In
import { TenantContext } from "../../../tenants/tenant-context.service";
import { TenantUser } from "../../../core/entities/tenant-user.entity";
import { RolePermission } from "../../../core/entities/role-permission.entity";
import { TenantAccess } from "../../../core/entities/tenant-access.entity";
import { User } from "../../user/entities/user.entity";

@Injectable()
export class TenantGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private tenantContext: TenantContext,
        private dataSource: DataSource,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredPermissions =
            this.reflector.getAllAndOverride<string[]>(
                'permissions',
                [
                    context.getHandler(),
                    context.getClass(),
                ],
            );

        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user as { id: string };
        const tenantId = this.tenantContext.getTenantId();

        let roleIds: string[] = [];

        // ------------------------------------------------------------------
        // 1️⃣ مرحله اول: چک کردن TenantAccess (مسیر: TenantAccess -> User -> Roles)
        // ------------------------------------------------------------------
        const tenantAccess = await this.dataSource
            .getRepository(TenantAccess)
            .createQueryBuilder('ta')
            .where('ta.tenantId = :tenantId', { tenantId })
            .andWhere('ta.managerId = :managerId', { managerId: user.id })
            .getOne();

        if (tenantAccess) {
            // تغییر: دریافت کاربر به همراه تمام نقش‌هایش (ساختار جدید User)
            const userWithRoles = await this.dataSource.getRepository(User)
                .createQueryBuilder('user')
                .leftJoinAndSelect('user.roles', 'roles') // <--- استفاده از user.roles (چندگانه)
                .where('user.id = :id', { id: tenantAccess.managerId })
                .getOne();

            if (userWithRoles && userWithRoles.roles) {
                // اضافه کردن ID تمام نقش‌های یافت شده به لیست
                roleIds.push(...userWithRoles.roles.map(r => r.id));
            }
        }

        // ------------------------------------------------------------------
        // 2️⃣ مرحله دوم: چک کردن TenantUser (مسیر: TenantUser -> Role)
        // ------------------------------------------------------------------
        // این بخش طبق خواسته شما بدون تغییر باقی ماند (تک نقش)
        if (roleIds.length === 0) {
            const tenantUser = await this.dataSource
                .getRepository(TenantUser)
                .createQueryBuilder('tu')
                .leftJoinAndSelect('tu.role', 'role') // <--- بدون تغییر: tu.role (تک)
                .where('tu.tenantId = :tenantId', { tenantId })
                .andWhere('tu.userId = :userId', { userId: user.id })
                .getOne();

            if (tenantUser && tenantUser.role) {
                // اضافه کردن ID نقش یافت شده به لیست
                roleIds.push(tenantUser.role.id);
            } else {
                throw new ForbiddenException('User not found in tenant');
            }
        }

        // ------------------------------------------------------------------
        // 3️⃣ مرحله سوم: بررسی پرمیشن‌ها
        // ------------------------------------------------------------------
        if (roleIds.length === 0) {
            throw new ForbiddenException('Role not found');
        }

        // تغییر: دریافت دسترسی‌های مربوط به تمام نقش‌های یافت شده
        const rolePermissions = await this.dataSource
            .getRepository(RolePermission)
            .find({
                where: {
                    roleId: In(roleIds), // <--- استفاده از In برای جستجو در چندین ID
                },
                relations: ['permission'],
            } as any);

        const userPermissions = rolePermissions.map(
            (rp) => rp.permission.name,
        );

        const hasAll = requiredPermissions.every((p) =>
            userPermissions.includes(p),
        );

        if (!hasAll) {
            throw new ForbiddenException('Insufficient permissions');
        }

        return true;
    }
}