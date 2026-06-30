export const TENANT_TYPE_LABELS: Record<string, string> = {
    'MARKET': 'پت‌ شاپ',
    'CLINIC': 'کلینیک',
    'PHARMACY': 'داروخانه',
    'VET': 'دامپزشک',
};

export const getTenantTypeLabel = (type: string): string => {
    return TENANT_TYPE_LABELS[type] || 'فروشگاه';
};