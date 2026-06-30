// src/shared/auth/decorators/acl.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const ACL_METADATA = 'acl_metadata';

export function ACL(action: 'create' | 'read' | 'update' | 'delete', resource: string, possession: 'Any' | 'Own' = 'Any') {
    return SetMetadata(ACL_METADATA, { action, resource, possession });
}
