import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {DataSource, In} from 'typeorm';
import { User } from "../../user/entities/user.entity";
import { RolePermission } from "../../../core/entities/role-permission.entity";

@Injectable()
export class AdminGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
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
        const user = request.user as { id: string; roles?: any[] };

        if (!user || !user.id) {
            throw new ForbiddenException('User not authenticated');
        }

        // ۲. دریافت کاربر به همراه تمام نقش‌های او (ManyToMany)
        const userWithRoles = await this.dataSource.getRepository(User).findOne({
            where: { id: user.id },
            relations: ['roles'], // لود کردن آرایه نقش‌ها
        });

        if (!userWithRoles || !userWithRoles.roles || userWithRoles.roles.length === 0) {
            throw new ForbiddenException('User roles not found');
        }

        // ۳. استخراج ID تمام نقش‌های کاربر
        const roleIds = userWithRoles.roles.map((r) => r.id);

        // ۴. دریافت تمام دسترسی‌های مرتبط با نقش‌های کاربر
        const rolePermissions = await this.dataSource
            .getRepository(RolePermission)
            .find({
                where: {
                    roleId: In(roleIds), // <--- استفاده از In برای جستجو در چندین نقش
                },
                relations: ['permission'],
            });

        // ۵. استخراج نام دسترسی‌ها
        const userPermissions = rolePermissions.map(
            (rp) => rp.permission.name,
        );

        // ۶. بررسی تطابق پرمیژن‌ها
        const hasAllPermissions = requiredPermissions.every((p) =>
            userPermissions.includes(p),
        );

        if (!hasAllPermissions) {
            throw new ForbiddenException('Insufficient permissions');
        }

        return true;
    }
}