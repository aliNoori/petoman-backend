/**
 * Simple in-memory cache for tenant capabilities
 */
export class TenantCapabilityCache {
    private static cache = new Map<string, string[]>();

    static get(tenantId: string): string[] | null {
        return this.cache.get(tenantId) || null;
    }

    static set(tenantId: string, capabilities: string[]) {
        this.cache.set(tenantId, capabilities);
    }

    static clear(tenantId: string) {
        this.cache.delete(tenantId);
    }
}
