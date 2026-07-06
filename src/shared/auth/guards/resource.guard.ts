// src/shared/auth/guards/resource.guard.ts
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRolesBuilder, RolesBuilder } from 'nest-access-control';
import { ACL_METADATA } from './acl.decorator';

@Injectable()
export class ResourceGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        @InjectRolesBuilder() private rolesBuilder: RolesBuilder,
    ) {}

    canActivate(context: ExecutionContext): boolean {
        const { action, resource, possession } =
        this.reflector.get(ACL_METADATA, context.getHandler()) ||
        this.reflector.get(ACL_METADATA, context.getClass());

        if (!resource || !action) return true; // بدون تعریف ACL → آزاد

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) throw new ForbiddenException('User not authenticated.');

        const permission = this.rolesBuilder
            .can(user.legacyRoles)
            [`${action}${possession}`](resource);

        if (!permission.granted) {
            throw new ForbiddenException(`You do not have permission to ${action} ${resource}`);
        }

        return true;
    }
}