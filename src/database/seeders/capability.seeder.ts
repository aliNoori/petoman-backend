import { DataSource } from 'typeorm';
import { Capability } from '../../core/entities/capability.entity';

// لیست کامل کپابیلیتی‌ها بر اساس نیازهای VET, CLINIC, MARKET, PHARMACY
export const CAPABILITIES = [
    // ==========================================
    // 1. GENERAL TENANT MANAGEMENT (مشترک بین همه)
    // ==========================================
    { name: 'TENANT_PROFILE_MANAGEMENT', description: 'Manage basic profile info (Name, Logo, Contact, Address)' },
    { name: 'TENANT_SETTINGS', description: 'Manage general settings (Status, Working Hours, Do Not Disturb, Language)' },
    { name: 'DOCUMENT_MANAGEMENT', description: 'Upload/Manage documents (License, ID, Insurance, Certificates)' },
    { name: 'DOCUMENT_VERIFICATION_VIEW', description: 'View verification status and reasons for rejection of documents' },

    // ==========================================
    // 2. FINANCIAL & WALLET (مالی و کیف پول)
    // ==========================================
    { name: 'WALLET_VIEW', description: 'View wallet balance and transaction history' }, // 🆕 تفکیک دیدن از مدیریت
    { name: 'WITHDRAWAL_REQUEST', description: 'Request withdrawal from wallet to bank account' },
    { name: 'INVOICE_MANAGEMENT', description: 'Generate and download invoices for transactions/services' },
    { name: 'TAX_MANAGEMENT', description: 'Manage tax settings and view tax reports' },

    // ==========================================
    // 3. MARKETING & PROMOTIONS (بازاریابی)
    // ==========================================
    { name: 'COUPON_MANAGEMENT', description: 'Create and manage discount coupons' },
    { name: 'BANNER_MANAGEMENT', description: 'Manage home page banners and promotions' },
    { name: 'REVIEW_MANAGEMENT', description: 'View and reply to customer reviews' },

    // ==========================================
    // 4. COMMUNICATION & SUPPORT (ارتباطات)
    // ==========================================
    { name: 'CHAT_MANAGEMENT', description: 'Enable/Disable and manage live chat with customers' },
    { name: 'PHONE_SUPPORT_MANAGEMENT', description: 'Manage phone support settings (Instant/Scheduled)' },
    { name: 'SUPPORT_TICKET_MANAGEMENT', description: 'Manage support tickets raised by customers' },
    { name: 'NOTIFICATION_SETTINGS', description: 'Manage SMS, Email, and Push notification preferences' },

    // ==========================================
    // 5. MARKET SPECIFIC (فروشگاه عمومی)
    // ==========================================
    { name: 'PRODUCT_MANAGEMENT', description: 'CRUD operations for products (Simple/Variable)' },
    { name: 'ORDER_MANAGEMENT', description: 'Manage orders (Pending, Processing, Shipped, Delivered)' },
    { name: 'SHIPPING_MANAGEMENT', description: 'Configure shipping zones, methods, and costs' },
    { name: 'PRODUCT_REVIEW_REPLY', description: 'Specific permission to reply to product reviews' },

    // ==========================================
    // 6. PHARMACY SPECIFIC (داروخانه)
    // ==========================================
    { name: 'MEDICINE_MANAGEMENT', description: 'CRUD operations for medicines (Stock, Batch, Expiry)' },
    { name: 'PRESCRIPTION_VERIFICATION', description: 'Verify and process e-prescriptions' },
    { name: 'CONTROLLED_DRUGS_MANAGEMENT', description: 'Special handling for controlled/restricted drugs' },
    { name: 'DRUG_INTERACTION_CHECK', description: 'Check drug interactions (if API integration exists)' },

    // ==========================================
    // 7. VET & CLINIC SPECIFIC (دامپزشکی و کلینیک)
    // ==========================================
    { name: 'APPOINTMENT_MANAGEMENT', description: 'Manage online and phone appointments' },
    { name: 'SERVICE_MANAGEMENT', description: 'Manage clinic services (Consultation, Surgery, Lab) and pricing' },
    { name: 'PATIENT_RECORD_MANAGEMENT', description: 'View and update patient medical history' },
    { name: 'VACCINATION_TRACKING', description: 'Track and manage vaccination schedules' },
    { name: 'CLINIC_REPORTS', description: 'Generate reports for revenue, appointments, and services' },

    // ==========================================
    // 8. ANALYTICS & REPORTING (گزارش‌گیری)
    // ==========================================
    { name: 'DASHBOARD_ACCESS', description: 'Access to the main dashboard with key metrics' },
    { name: 'SALES_REPORTS', description: 'Detailed sales reports and analytics' },
    { name: 'CUSTOMER_ANALYTICS', description: 'View customer behavior and purchase history' },
];

export async function seedCapabilities(dataSource: DataSource) {
    const repo = dataSource.getRepository(Capability);
    let count = 0;

    for (const cap of CAPABILITIES) {
        const exists = await repo.findOne({ where: { name: cap.name } });
        if (!exists) {
            await repo.save(repo.create(cap));
            count++;
        }
    }

    console.log(`✅ Capabilities data seeded successfully. Added ${count} new capabilities.`);
}