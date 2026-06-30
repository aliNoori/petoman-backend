import { SetMetadata } from '@nestjs/common';

/**
 * Sets required capabilities on route
 */
export const CAPABILITIES_KEY = 'capabilities';
export const Capabilities = (...capabilities: string[]) =>
    SetMetadata(CAPABILITIES_KEY, capabilities);
