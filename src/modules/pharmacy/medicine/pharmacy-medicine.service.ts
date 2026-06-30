import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    NotFoundException
} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {DataSource, Repository} from 'typeorm';
import {Medicine, MedicineStatus} from "../../../shared/medicine/medicine.entity";
import {PharmacyMedicine, PharmacyMedicineStatus} from './pharmacy-medicine.entity';
import {CreatePharmacyMedicineDto} from './dto/create-pharmacy-medicine.dto';
import {UpdatePharmacyMedicineDto} from "./dto/update-pharmacy-medicine.dto";
import {TenantContext} from "../../../tenants/tenant-context.service";
import {AttachMedicineDto} from "./dto/attach-medicine.dto";
import {I18nService} from 'nestjs-i18n';

@Injectable()
export class PharmacyMedicineService {
    constructor(
        private readonly dataSource: DataSource,
        @InjectRepository(Medicine)
        private medicineRepository: Repository<Medicine>,
        @InjectRepository(PharmacyMedicine)
        private pharmacyMedicineRepository: Repository<PharmacyMedicine>,
        private readonly tenantService: TenantContext,
        private readonly i18n: I18nService
    ) {
    }

    /**
     * دریافت لیست داروهای داروخانه
     */
    async findAllMedicine(userId: string) {
        const tenantId = this.tenantService.getTenantId();

        // ✅ استفاده از i18n برای لاگ یا در صورت نیاز به پردازش خاص
        // در اینجا فقط داده‌ها را برمی‌گردانیم
        return this.pharmacyMedicineRepository.find({
            where: {tenantId},
            relations: ['medicine'],
            order: {createdAt: 'DESC'}
        });
    }

    /**
     * دریافت لیست داروهای سراسری
     */
    async findAllGlobalMedicine(userId: string) {
        return this.medicineRepository.find({
            where: {isActive: true,status:MedicineStatus.APPROVED}, // فقط داروهای فعال
            order: {name: 'ASC'}
        });
    }

    /**
     * دریافت جزئیات یک دارو
     */
    async findOneMedicine(medicineId: string, userId: string) {
        const tenantId = this.tenantService.getTenantId();

        const pharmacyMedicine = await this.pharmacyMedicineRepository.findOne({
            where: {id: medicineId, tenantId},
            relations: ['medicine']
        });

        if (!pharmacyMedicine) {
            throw new NotFoundException(await this.i18n.translate('pharmacy.detail_success')); // یا پیام خاص not_found
        }

        return pharmacyMedicine;
    }

    // ---------------------------------------------------------
    // 1. ایجاد (Create)
    // ---------------------------------------------------------
    async create(dto: CreatePharmacyMedicineDto, userId: string) {
        const tenantId = this.tenantService.getTenantId();
        let targetMedicineId: string;

        return this.dataSource.transaction(async (manager) => {
            try {
                if (dto.medicineId) {
                    // دارو از لیست سراسری انتخاب شده
                    const medicineExists = await manager.findOne(Medicine, {
                        where: {id: dto.medicineId}
                    });
                    if (!medicineExists) {
                        throw new NotFoundException(await this.i18n.t('product.global_product_not_found')); // یا کلید خاص دارو
                    }
                    targetMedicineId = dto.medicineId;
                } else {
                    // ایجاد داروی جدید در سیستم سراسری
                    if (dto.code) {
                        const existingCode = await manager.findOne(Medicine, {
                            where: {code: dto.code}
                        });
                        if (existingCode) {
                            throw new BadRequestException(await this.i18n.t('product.code_exists')); // یا کلید خاص دارو
                        }
                    }

                    const newMedicine = manager.create(Medicine, {
                        tenantId:tenantId,
                        name: dto.name,
                        code: dto.code,
                        //type:dto.type,
                        category: dto.category,
                        categoryBreadcrumb: dto.categoryBreadcrumb,
                        activeIngredient: dto.activeIngredient,
                        dosageForm: dto.dosageForm,
                        dosage: dto.dosage,
                        suitableFor: dto.suitableFor,
                        storage: dto.storage,
                        prescriptionRequired: dto.prescriptionRequired,
                        image: dto.image,
                        galleryImages: dto.galleryImages,
                        isActive: true,
                        createdByTenantId: tenantId,
                        createdByUserId: userId, // ✅ ثبت کاربر سازنده
                        isApproved: false
                    });

                    const savedMedicine = await manager.save(newMedicine);
                    targetMedicineId = savedMedicine.id;
                }

                // محاسبه قیمت نهایی
                const finalPrice = this.calculateDiscountedPrice(
                    dto.price,
                    dto.hasDiscount,
                    dto.discountType,
                    dto.discountValue
                );

                // ایجاد نگاشت داروخانه
                const newPharmacyMedicine = manager.create(PharmacyMedicine, {
                    tenantId,
                    medicineId: targetMedicineId,
                    price: dto.price,
                    stock: dto.stock,
                    expiryDate: dto.expiryDate,
                    isActive: dto.isActive ?? true,
                    hasDiscount: dto.hasDiscount ?? false,
                    discountType: dto.discountType,
                    discountValue: dto.discountValue,
                    discountedPrice: finalPrice,
                    createdByUserId: userId // ✅ ثبت کاربر ایجادکننده
                });

                const savedEntity = await manager.save(newPharmacyMedicine);

                // بازگرداندن داده‌های کامل
                return manager.findOne(PharmacyMedicine, {
                    where: {id: savedEntity.id},
                    relations: ['medicine']
                });

            } catch (error) {
                if (error instanceof BadRequestException || error instanceof NotFoundException) {
                    throw error;
                }
                throw new InternalServerErrorException(await this.i18n.t('product.create_error'));
            }
        });
    }

    /**
     * اتصال یک داروی سراسری موجود به داروخانه
     */
    async attachMedicine(dto: AttachMedicineDto, userId: string) {
        const tenantId = this.tenantService.getTenantId();

        if (!dto.globalMedicineId) {
            throw new BadRequestException(await this.i18n.translate('product.global_product_id_required'));
        }

        return this.dataSource.transaction(async (manager) => {
            try {
                // 1. یافتن داروی سراسری
                const baseMedicine = await manager.findOne(Medicine, {
                    where: {id: dto.globalMedicineId},
                    select: ['id', 'name', 'category', 'image', 'code']
                } as any);

                if (!baseMedicine) {
                    throw new NotFoundException(await this.i18n.translate('product.global_product_not_found'));
                }

                // 2. بررسی تکراری نبودن اتصال
                const existingAttachment = await manager.findOne(PharmacyMedicine, {
                    where: {tenantId, medicineId: dto.globalMedicineId}
                });

                if (existingAttachment) {
                    throw new BadRequestException(await this.i18n.translate('error.medicine.already_attached'));
                }

                // 3. ایجاد نگاشت
                const pharmacyMedicine = manager.create(PharmacyMedicine, {
                    tenantId,
                    price: dto.price,
                    stock: dto.stock,
                    isActive: dto.isActive ?? true,
                    expiryDate: dto.expiryDate,
                    hasDiscount: dto.hasDiscount ?? false,
                    discountType: dto.discountType,
                    discountValue: dto.discountValue,
                    discountedPrice: this.calculateDiscountedPrice(
                        dto.price,
                        dto.hasDiscount,
                        dto.discountType,
                        dto.discountValue
                    ),
                    medicine: baseMedicine,
                    createdByUserId: userId
                });

                const savedEntity = await manager.save(pharmacyMedicine);

                // بازگرداندن ساختار یکپارچه
                return manager.findOne(PharmacyMedicine, {
                    where: {id: savedEntity.id},
                    relations: ['medicine']
                });

            } catch (error) {
                if (error instanceof BadRequestException || error instanceof NotFoundException) {
                    throw error;
                }
                throw new InternalServerErrorException(await this.i18n.translate('product.attach_success')); // یا پیام خطای attach
            }
        });
    }

    // ---------------------------------------------------------
    // 2. ویرایش (Update)
    // ---------------------------------------------------------
    async update(id: string, dto: UpdatePharmacyMedicineDto, userId: string) {
        const tenantId = this.tenantService.getTenantId();

        // 1. دریافت رکورد مربوط به همین داروخانه
        const pharmacyMedicine = await this.pharmacyMedicineRepository.findOne({
            where: {id, tenantId},
            relations: ['medicine']
        });

        if (!pharmacyMedicine) {
            throw new NotFoundException(await this.i18n.translate('product.not_found'));
        }

        // 2. بررسی اینکه آیا این داروخانه سازنده اولیه دارو است؟
        const isCreator = pharmacyMedicine.medicine.createdByTenantId === tenantId;
        const isApproved = pharmacyMedicine.medicine.isApproved;

        // --- شروع منطق شرطی ---

        // همیشه فیلدهای مربوط به داروخانه (قیمت، موجودی، تخفیف و...) قابل ویرایش هستند
        // چون این رکورد متعلق به خود داروخانه است.
        if ('price' in dto) pharmacyMedicine.price = dto.price!;
        if ('stock' in dto) pharmacyMedicine.stock = dto.stock!;
        if ('expiryDate' in dto) pharmacyMedicine.expiryDate = dto.expiryDate;
        if ('isActive' in dto) pharmacyMedicine.isActive = dto.isActive!;
        if ('hasDiscount' in dto) pharmacyMedicine.hasDiscount = dto.hasDiscount!;
        if ('discountType' in dto) pharmacyMedicine.discountType = dto.discountType!;
        if ('discountValue' in dto) pharmacyMedicine.discountValue = dto.discountValue!;

        // محاسبه قیمت نهایی
        pharmacyMedicine.discountedPrice = this.calculateDiscountedPrice(
            pharmacyMedicine.price,
            pharmacyMedicine.hasDiscount,
            pharmacyMedicine.discountType,
            pharmacyMedicine.discountValue
        );

        // آپدیت فیلدهای عمومی دارو (Medicine)
        // این بخش فقط زمانی اجرا می‌شود که:
        // 1. داروخانه سازنده اولیه باشد (isCreator)
        // 2. دارو هنوز توسط مدیر تایید نشده باشد (!isApproved)
        if (isCreator && !isApproved) {
            if ('name' in dto && dto.name) pharmacyMedicine.medicine.name = dto.name!;
            if ('code' in dto && dto.code) pharmacyMedicine.medicine.code = dto.code!;
            if ('category' in dto && dto.category) pharmacyMedicine.medicine.category = dto.category!;
            if ('categoryBreadcrumb' in dto && dto.categoryBreadcrumb) pharmacyMedicine.medicine.categoryBreadcrumb = dto.categoryBreadcrumb!;
            if ('activeIngredient' in dto) pharmacyMedicine.medicine.activeIngredient = dto.activeIngredient!;
            if ('dosageForm' in dto) pharmacyMedicine.medicine.dosageForm = dto.dosageForm!;
            if ('dosage' in dto) pharmacyMedicine.medicine.dosage = dto.dosage!;
            if ('suitableFor' in dto) pharmacyMedicine.medicine.suitableFor = dto.suitableFor!;
            if ('storage' in dto) pharmacyMedicine.medicine.storage = dto.storage!;
            if ('prescriptionRequired' in dto) pharmacyMedicine.medicine.prescriptionRequired = dto.prescriptionRequired!;
            if ('image' in dto && dto.image) pharmacyMedicine.medicine.image = dto.image;
            if ('galleryImages' in dto && dto.galleryImages) pharmacyMedicine.medicine.galleryImages = dto.galleryImages;

            pharmacyMedicine.medicine.status = MedicineStatus.PENDING
            pharmacyMedicine.status=PharmacyMedicineStatus.PENDING
            // *** ذخیره جداگانه جدول medicine ***
            await this.medicineRepository.save(pharmacyMedicine.medicine);
        }

        // 3. ذخیره نهایی تغییرات
        await this.pharmacyMedicineRepository.save(pharmacyMedicine);

        // 4. بازگرداندن داده‌های به‌روزرسانی شده
        return this.pharmacyMedicineRepository.findOne({
            where: {id},
            relations: ['medicine']
        });
    }

    // ---------------------------------------------------------
    // 3. حذف (Delete)
    // ---------------------------------------------------------
    async remove(id: string, userId: string) {
        const tenantId = this.tenantService.getTenantId();

        const pharmacyMedicine = await this.pharmacyMedicineRepository.findOne({
            where: {id, tenantId},
            relations: ['medicine']
        });

        if (!pharmacyMedicine) {
            throw new NotFoundException(await this.i18n.translate('product.not_found'));
        }

        const isOwner = pharmacyMedicine.medicine.createdByTenantId === tenantId;
        const isApproved = pharmacyMedicine.medicine.isApproved;

        if (!isOwner || isApproved) {
            throw new ForbiddenException(await this.i18n.translate('forbidden'));
        }

        await this.pharmacyMedicineRepository.remove(pharmacyMedicine);

        // بازگرداندن ساختار استاندارد حتی برای حذف (برای هماهنگی با کنترلر)
        return {
            id: id,
            message: 'Deleted' // این پیام در کنترلر با i18n جایگزین می‌شود
        };
    }

    private calculateDiscountedPrice(
        price: number,
        hasDiscount?: boolean,
        type?: 'percentage' | 'fixed',
        value?: number
    ): number {
        let finalPrice = price;
        if (hasDiscount && value) {
            if (type === 'percentage') {
                finalPrice = price - (price * value) / 100;
            } else {
                finalPrice = price - value;
            }
        }
        return finalPrice < 0 ? 0 : finalPrice;
    }

    async updateMedicineStatus(id: string, isActive: boolean, userId: string) {
        const tenantId = this.tenantService.getTenantId();
        const pharmacyMedicineRepo = this.pharmacyMedicineRepository;

        const pharmacyMedicine = await pharmacyMedicineRepo.findOne({
            where: {id, tenantId},
            relations: ['medicine']
        });

        if (!pharmacyMedicine) {
            throw new NotFoundException(await this.i18n.translate('product.not_found'));
        }

        const isOwner = pharmacyMedicine.medicine.createdByTenantId === tenantId;

        if (!isOwner) {
            throw new ForbiddenException(await this.i18n.translate('forbidden'));
        }

        pharmacyMedicine.isActive = isActive;
        pharmacyMedicine.updatedByUserId = userId; // ✅ ثبت کاربر تغییردهنده

        await pharmacyMedicineRepo.save(pharmacyMedicine);

        return pharmacyMedicineRepo.findOne({
            where: {id},
            relations: ['medicine']
        });
    }
}