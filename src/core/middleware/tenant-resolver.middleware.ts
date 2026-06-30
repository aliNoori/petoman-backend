import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantContext} from "../../tenants/tenant-context.service";

@Injectable()
export class TenantResolverMiddleware implements NestMiddleware {
    constructor(private tenantContext: TenantContext) {}

    use(req: Request, res: Response, next: NextFunction) {
        const tenantId = req.headers['x-tenant-id'];

        if (!tenantId || typeof tenantId !== 'string') {
            throw new Error('X-Tenant-Id header is required');
        }

        this.tenantContext.setTenantId(tenantId);
        next();
    }
}
