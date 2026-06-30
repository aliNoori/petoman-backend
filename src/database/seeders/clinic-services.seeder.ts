// src/seeds/seed-clinic-services.ts
import { DataSource } from 'typeorm';
import { ClinicService} from "../../modules/vet&clinic/entities/clinic-service.entity";

export const DEFAULT_CLINIC_SERVICES = [
    { value: 'visit', label: 'ویزیت', icon: 'ti ti-stethoscope' },
    { value: 'surgery', label: 'جراحی', icon: 'ti ti-cut' },
    { value: 'lab', label: 'آزمایشگاه', icon: 'ti ti-test-pipe' },
    { value: 'radiology', label: 'رادیولوژی', icon: 'ti ti-scan' },
    { value: 'hospitalization', label: 'بستری', icon: 'ti ti-bed' },
    { value: 'vaccination', label: 'واکسیناسیون', icon: 'ti ti-vaccine' },
    { value: 'grooming', label: 'آرایشگری', icon: 'ti ti-scissors' },
    { value: 'emergency', label: 'اورژانس ۲۴/۷', icon: 'ti ti-urgent' },
];

export async function seedClinicServices(dataSource: DataSource) {
    const repo = dataSource.getRepository(ClinicService);

    for (const item of DEFAULT_CLINIC_SERVICES) {
        // بررسی وجود سرویس با کد مشخص
        let service = await repo.findOne({ where: { value: item.value } });

        if (!service) {
            // اگر وجود نداشت، ایجاد کن
            service = repo.create({
                value: item.value,
                label: item.label,
                icon: item.icon,
                isActive: true,
            });
            await repo.save(service);

        } else {
            // اگر وجود داشت، فقط لیبل و آیکون را آپدیت کن (در صورت تغییر در کد ثابت)
            if (service.label !== item.label || service.icon !== item.icon) {
                service.label = item.label;
                service.icon = item.icon;
                await repo.save(service);

            } else {
                console.log(`ℹ️ Service ${item.label} already exists.`);
            }
        }
    }

    console.log('✅ Clinic Services seeded successfully');
}