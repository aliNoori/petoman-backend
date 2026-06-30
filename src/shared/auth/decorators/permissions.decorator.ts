import { SetMetadata } from '@nestjs/common';

/**
 * Sets required permissions on route
 */
export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: string[]) =>
    SetMetadata(PERMISSIONS_KEY, permissions);
