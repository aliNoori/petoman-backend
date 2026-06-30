/**
 * Defines which capabilities each tenant type has by default upon creation.
 */
export const TENANT_TYPE_CAPABILITIES: Record<string, string[]> = {
    MARKET: [
        // General
        'TENANT_PROFILE_MANAGEMENT',
        'TENANT_SETTINGS',
        'DOCUMENT_MANAGEMENT',
        'WALLET_VIEW',
        'WITHDRAWAL_REQUEST',
        'INVOICE_MANAGEMENT',
        'CHAT_MANAGEMENT',
        'PHONE_SUPPORT_MANAGEMENT',
        'NOTIFICATION_SETTINGS',

        // Market Specific
        'PRODUCT_MANAGEMENT',
        'ORDER_MANAGEMENT',
        'SHIPPING_MANAGEMENT',
        'COUPON_MANAGEMENT',
        'BANNER_MANAGEMENT',
        'REVIEW_MANAGEMENT',
        'PRODUCT_REVIEW_REPLY',
        'DASHBOARD_ACCESS',
        'SALES_REPORTS',
    ],
    PHARMACY: [
        // General
        'TENANT_PROFILE_MANAGEMENT',
        'TENANT_SETTINGS',
        'DOCUMENT_MANAGEMENT',
        'WALLET_VIEW',
        'WITHDRAWAL_REQUEST',
        'INVOICE_MANAGEMENT',
        'CHAT_MANAGEMENT',
        'PHONE_SUPPORT_MANAGEMENT',
        'NOTIFICATION_SETTINGS',

        // Pharmacy Specific
        'MEDICINE_MANAGEMENT',
        'PRESCRIPTION_VERIFICATION',
        'CONTROLLED_DRUGS_MANAGEMENT',
        'DRUG_INTERACTION_CHECK',
        'EXPIRY_TRACKING', // Optional if handled inside Medicine Management

        // Shared Market Features (Pharmacies also sell products)
        'PRODUCT_MANAGEMENT', // If they sell non-medicine items
        'ORDER_MANAGEMENT',
        'SHIPPING_MANAGEMENT',
        'COUPON_MANAGEMENT',
        'BANNER_MANAGEMENT',
        'REVIEW_MANAGEMENT',
        'DASHBOARD_ACCESS',
        'SALES_REPORTS',
    ],
    VET: [
        // General
        'TENANT_PROFILE_MANAGEMENT',
        'TENANT_SETTINGS',
        'DOCUMENT_MANAGEMENT',
        'WALLET_VIEW',
        'WITHDRAWAL_REQUEST',
        'INVOICE_MANAGEMENT',
        'CHAT_MANAGEMENT',
        'PHONE_SUPPORT_MANAGEMENT',
        'NOTIFICATION_SETTINGS',

        // Vet Specific
        'APPOINTMENT_MANAGEMENT',
        'SERVICE_MANAGEMENT',
        'PATIENT_RECORD_MANAGEMENT',
        'VACCINATION_TRACKING',
        'CLINIC_REPORTS',

        // Shared
        'REVIEW_MANAGEMENT',
        'DASHBOARD_ACCESS',
        'SALES_REPORTS',
    ],
    CLINIC: [
        // General
        'TENANT_PROFILE_MANAGEMENT',
        'TENANT_SETTINGS',
        'DOCUMENT_MANAGEMENT',
        'WALLET_VIEW',
        'WITHDRAWAL_REQUEST',
        'INVOICE_MANAGEMENT',
        'CHAT_MANAGEMENT',
        'PHONE_SUPPORT_MANAGEMENT',
        'NOTIFICATION_SETTINGS',

        // Clinic Specific
        'APPOINTMENT_MANAGEMENT',
        'SERVICE_MANAGEMENT',
        'PATIENT_RECORD_MANAGEMENT',
        'INVOICE_GENERATION', // Specific for medical invoices
        'CLINIC_REPORTS',
        'TAX_MANAGEMENT',

        // Shared
        'REVIEW_MANAGEMENT',
        'DASHBOARD_ACCESS',
        'SALES_REPORTS',
    ],
};