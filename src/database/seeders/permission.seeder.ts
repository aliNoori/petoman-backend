import { DataSource } from 'typeorm';
import { Permission } from '../../core/entities/permission.entity';

export const PERMISSIONS = [
    // ==================== مدیریت کل (Super Admin) ====================
    '*',
    'tenant.manage',
    'account.manage',
    // ==================== داشبورد و گزارشات ====================
    'dashboard.view',
    'report.sales',
    'report.financial',
    'report.analytics',
    // ==================== مدیریت کاربران ====================
    'users.list',
    'users.view',
    'users.manage',
    'users.roles.assign',
    // ==================== مارکت‌پلیس و محصولات ====================
    'products.list',
    'products.view',
    'products.manage',
    'categories.manage',
    'brands.manage',
    // ==================== سفارشات و درخواست‌ها ====================
    'orders.list',
    'orders.view',
    'orders.manage',
    'orders.export',
    'requests.manage',
    // ==================== نظرات و تعاملات ====================
    'reviews.list',
    'reviews.manage',
    'comments.manage',
    'tickets.manage',
    // ==================== کلینیک و سلامت ====================
    'doctors.list',
    'doctors.manage',
    'doctors.schedule',
    'appointments.list',
    'appointments.view',
    'appointments.manage',
    'medical_records.view',
    // ==================== داروخانه ====================
    'prescriptions.manage',
    'prescriptions.list',
    'prescriptions.view',
    'prescriptions.verify',
    'prescriptions.dispense',
    'inventory.manage',
    'medicines.manage',
    'medicines.list',
    'medicines.view',
    // ==================== مالی و کیف پول ====================
    'wallets.manage',
    'wallets.list',
    'wallets.view',
    'wallets.adjust',
    'wallets.freeze',
    'transactions.manage',
    'transactions.list',
    'transactions.view',
    'transactions.verify',
    'transactions.settle',
    // ==================== تنظیمات سیستم ====================
    'settings.manage',
    'settings.general',
    'settings.payment',
    'settings.notifications',
];

// نگاشت نام پرمتیون به لیبل و توضیحات
const PERMISSION_DETAILS: Record<string, { label: string; description: string }> = {
    '*': { label: 'دسترسی کامل', description: 'دسترسی به تمام بخش‌های سیستم' },
    'tenant.manage': { label: 'مدیریت مستأجر/شرکت', description: 'مدیریت اطلاعات شرکت یا شعب' },
    'account.manage': { label: 'مدیریت حساب', description: 'مدیریت حساب‌های کاربری و تنظیمات حساب' },
    'dashboard.view': { label: 'مشاهده داشبورد', description: 'دسترسی به صفحه اصلی و نمودارها' },
    'report.sales': { label: 'گزارشات فروش', description: 'مشاهده و تحلیل گزارش‌های فروش' },
    'report.financial': { label: 'گزارشات مالی', description: 'مشاهده گزارش‌های مالی و حسابداری' },
    'report.analytics': { label: 'گزارشات تحلیلی', description: 'دسترسی به تحلیل‌های آماری' },
    'users.list': { label: 'لیست کاربران', description: 'مشاهده لیست کاربران سیستم' },
    'users.view': { label: 'مشاهده کاربر', description: 'مشاهده جزئیات یک کاربر خاص' },
    'users.manage': { label: 'مدیریت کاربران', description: 'ایجاد، ویرایش و حذف کاربران' },
    'users.roles.assign': { label: 'تعیین نقش', description: 'تعیین یا تغییر نقش کاربران' },
    'products.list': { label: 'لیست محصولات', description: 'مشاهده لیست محصولات' },
    'products.view': { label: 'مشاهده محصول', description: 'مشاهده جزئیات محصول' },
    'products.manage': { label: 'مدیریت محصولات', description: 'ایجاد و ویرایش محصولات' },
    'categories.manage': { label: 'مدیریت دسته‌بندی', description: 'مدیریت دسته‌بندی محصولات' },
    'brands.manage': { label: 'مدیریت برندها', description: 'مدیریت برندهای محصولات' },
    'orders.list': { label: 'لیست سفارشات', description: 'مشاهده لیست سفارشات' },
    'orders.view': { label: 'مشاهده سفارش', description: 'مشاهده جزئیات سفارش' },
    'orders.manage': { label: 'مدیریت سفارشات', description: 'تغییر وضعیت و مدیریت سفارشات' },
    'orders.export': { label: 'خروجی سفارشات', description: 'دریافت خروجی اکسل یا PDF سفارشات' },
    'requests.manage': { label: 'مدیریت درخواست‌ها', description: 'مدیریت درخواست‌های سیستم' },
    'reviews.list': { label: 'لیست نظرات', description: 'مشاهده نظرات کاربران' },
    'reviews.manage': { label: 'مدیریت نظرات', description: 'تایید یا حذف نظرات' },
    'comments.manage': { label: 'مدیریت کامنت‌ها', description: 'مدیریت کامنت‌های زیر محصولات یا مقالات' },
    'tickets.manage': { label: 'مدیریت تیکت‌ها', description: 'پاسخ‌دهی و مدیریت تیکت‌های پشتیبانی' },
    'doctors.list': { label: 'لیست پزشکان', description: 'مشاهده لیست پزشکان' },
    'doctors.manage': { label: 'مدیریت پزشکان', description: 'ویرایش اطلاعات پزشکان' },
    'doctors.schedule': { label: 'برنامه وقت‌دهی پزشکان', description: 'مدیریت نوبت‌دهی پزشکان' },
    'appointments.list': { label: 'لیست نوبت‌ها', description: 'مشاهده لیست نوبت‌های رزرو شده' },
    'appointments.view': { label: 'مشاهده نوبت', description: 'مشاهده جزئیات نوبت' },
    'appointments.manage': { label: 'مدیریت نوبت‌ها', description: 'تغییر یا کنسل کردن نوبت‌ها' },
    'medical_records.view': { label: 'مشاهده سوابق پزشکی', description: 'دسترسی به پرونده پزشکی بیماران' },
    'prescriptions.manage': { label: 'مدیریت نسخه‌ها', description: 'مدیریت کامل نسخه‌های الکترونیک' },
    'prescriptions.list': { label: 'لیست نسخه‌ها', description: 'مشاهده لیست نسخه‌ها' },
    'prescriptions.view': { label: 'مشاهده نسخه', description: 'مشاهده جزئیات نسخه' },
    'prescriptions.verify': { label: 'تایید نسخه', description: 'تایید صحت نسخه توسط پزشک/داروساز' },
    'prescriptions.dispense': { label: 'تحویل دارو', description: 'ثبت تحویل دارو به بیمار' },
    'inventory.manage': { label: 'مدیریت انبار', description: 'مدیریت موجودی انبار داروخانه' },
    'medicines.manage': { label: 'مدیریت داروها', description: 'ویرایش اطلاعات داروها' },
    'medicines.list': { label: 'لیست داروها', description: 'مشاهده لیست داروهای موجود' },
    'medicines.view': { label: 'مشاهده دارو', description: 'مشاهده جزئیات دارو' },
    'wallets.manage': { label: 'مدیریت کیف پول', description: 'مدیریت کیف پول کاربران' },
    'wallets.list': { label: 'لیست کیف پول‌ها', description: 'مشاهده لیست کیف پول‌ها' },
    'wallets.view': { label: 'مشاهده کیف پول', description: 'مشاهده موجودی و تاریخچه کیف پول' },
    'wallets.adjust': { label: 'تنظیم کیف پول', description: 'افزایش یا کاهش دستی موجودی کیف پول' },
    'wallets.freeze': { label: 'مسدودسازی کیف پول', description: 'مسدود یا باز کردن کیف پول کاربر' },
    'transactions.manage': { label: 'مدیریت تراکنش‌ها', description: 'مدیریت تراکنش‌های مالی' },
    'transactions.list': { label: 'لیست تراکنش‌ها', description: 'مشاهده لیست تراکنش‌ها' },
    'transactions.view': { label: 'مشاهده تراکنش', description: 'مشاهده جزئیات تراکنش' },
    'transactions.verify': { label: 'تایید تراکنش', description: 'تایید نهایی تراکنش‌های مالی' },
    'transactions.settle': { label: 'تسویه حساب', description: 'انجام عملیات تسویه حساب' },
    'settings.manage': { label: 'مدیریت تنظیمات', description: 'دسترسی به تنظیمات کلی سیستم' },
    'settings.general': { label: 'تنظیمات عمومی', description: 'ویرایش تنظیمات عمومی سایت' },
    'settings.payment': { label: 'تنظیمات پرداخت', description: 'مدیریت درگاه‌ها و تنظیمات مالی' },
    'settings.notifications': { label: 'تنظیمات اعلان‌ها', description: 'مدیریت پیامک‌ها و ایمیل‌های سیستم' },
};

export async function seedPermissions(dataSource: DataSource) {
    const repo = dataSource.getRepository(Permission);

    for (const name of PERMISSIONS) {
        const exists = await repo.findOne({ where: { name } });

        if (!exists) {
            // اگر وجود نداشت، ایجاد کن
            const newPermission = repo.create({
                name,
                label: PERMISSION_DETAILS[name]?.label || name, // اگر لیبل تعریف نشده بود، خود نام را بگذار
                description: PERMISSION_DETAILS[name]?.description || ''
            });
            await repo.save(newPermission);
        } else {
            // اگر وجود داشت، آپدیت کن (برای اضافه کردن لیبل به دیتاهای قدیمی)
            const details = PERMISSION_DETAILS[name];
            if (details) {
                exists.label = details.label;
                exists.description = details.description;
                await repo.save(exists);
            }
        }
    }
    console.log('✅ Permissions data seeded successfully with labels and descriptions');
}