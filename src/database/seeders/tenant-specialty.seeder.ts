import { DataSource } from 'typeorm';
import { TenantSpecialty} from "../../core/entities/tenant-specialty.entity";

export const DEFAULT_SPECIALTIES = [
    { value: 'general', label: 'عمومی' },
    { value: 'surgery', label: 'جراحی' },
    { value: 'internal', label: 'بیماری‌های داخلی' },
    { value: 'dental', label: 'دندانپزشکی' },
    { value: 'radiology', label: 'رادیولوژی' },
    { value: 'nutrition', label: 'تغذیه' },
    { value: 'dermatology', label: 'پوست و مو' },
    { value: 'ophthalmology', label: 'چشم‌پزشکی' },
    { value: 'orthopedics', label: 'ارتوپدی' },
    { value: 'vet', label: 'دامپزشکی' },
];

export async function seedTenantSpecialties(dataSource: DataSource) {
    const repo = dataSource.getRepository(TenantSpecialty);

    for (const item of DEFAULT_SPECIALTIES) {
        // بررسی وجود تخصص با کد مشخص
        let specialty = await repo.findOne({ where: { value: item.value } });

        if (!specialty) {
            // اگر وجود نداشت، ایجاد کن
            specialty = repo.create({
                value: item.value,
                label: item.label,
                isActive: true,
            });
            await repo.save(specialty);
        } else {
            // اگر وجود داشت، فقط لیبل را آپدیت کن (برای جلوگیری از خطا اگر کاربر لیبل را تغییر داده باشد، بهتر است چک کنید)
            // در اینجا فرض می‌کنیم لیبل پیش‌فرض را می‌خواهیم ست کنیم اگر خالی باشد یا همیشه ست کنیم
            if (specialty.label !== item.label) {
                specialty.label = item.label;
                await repo.save(specialty);
            } else {
                console.log(`ℹ️ Specialty ${item.label} already exists.`);
            }
        }
    }
    console.log('✅ Tenant Specialties seeded successfully');
}