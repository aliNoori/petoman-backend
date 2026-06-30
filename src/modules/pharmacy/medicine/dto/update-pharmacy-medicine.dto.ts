import { PartialType, OmitType } from '@nestjs/swagger';
import { CreatePharmacyMedicineDto } from './create-pharmacy-medicine.dto';

export class UpdatePharmacyMedicineDto extends PartialType(CreatePharmacyMedicineDto
    // OmitType(CreatePharmacyMedicineDto, [
    //     'name',
    //     'code',
    //     'category',
    //     'activeIngredient',
    //     'dosageForm',
    //     'dosage',
    //     'suitableFor',
    //     'storage',
    //     'prescriptionRequired',
    //     'image',
    //     'galleryImages',
    //     'medicineId' // این فیلد نباید در ویرایش باشد
    // ] as const)
) {
    // باقی‌مانده‌ها (price, stock, expiryDate, ...) به صورت اختیاری در دسترس خواهند بود
}