import {
    CanActivate,
    ExecutionContext,
    Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { TenantContext} from "../../../tenants/tenant-context.service";
import { TenantMembershipService} from "../../../tenants/tenant-membership.service";

@Injectable()
export class TenantMembershipGuard implements CanActivate {
    constructor(
        private tenantContext: TenantContext,
        private membershipService: TenantMembershipService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request&any>();

        const user = request.user as { id: string };
        const tenantId = this.tenantContext.getTenantId();
        const sessionId = request.sessionId;

        await this.membershipService.assertUserInTenant(
            user.id,
            tenantId,
            sessionId
        );

        return true;
    }
}
