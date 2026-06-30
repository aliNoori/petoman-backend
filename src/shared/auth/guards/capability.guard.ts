import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { TenantContext} from "../../../tenants/tenant-context.service";
import { TenantCapability} from "../../../core/entities/tenant-capability.entity";

@Injectable()
export class CapabilityGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private tenantContext: TenantContext,
        private dataSource: DataSource,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredCapabilities =
            this.reflector.getAllAndOverride<string[]>(
                'capabilities',
                [
                    context.getHandler(),
                    context.getClass(),
                ],
            );

        if (!requiredCapabilities || requiredCapabilities.length === 0) {
            return true; // no capability required
        }

        const tenantId = this.tenantContext.getTenantId();

        /** 1️⃣ Load tenant capabilities */
        const tenantCapabilities = await this.dataSource
            .getRepository(TenantCapability)
            .find({
                where: { tenantId },
                relations: ['capability'],
            });

        const enabledCapabilities = tenantCapabilities.map(
            (tc) => tc.capability.name,
        );

        /** 2️⃣ Check */
        const hasAll = requiredCapabilities.every((c) =>
            enabledCapabilities.includes(c),
        );

        if (!hasAll) {
            throw new ForbiddenException(
                'Capability not enabled for this tenant',
            );
        }

        return true;
    }
}