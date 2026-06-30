import {BadRequestException, Injectable, NotFoundException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {DataSource, Repository} from 'typeorm'; // DataSource اضافه شد برای تراکنش
import {MarketProduct, MarketProductStatus} from "../../product/entities/product.entity";
import {Product, ProductStatus} from "../../../../shared/product/product.entity";
import {ProductReview} from "../../review/product-review.entity";
import {I18nService} from "nestjs-i18n";
import {NotificationService} from "../../../../shared/notification/notification.service";
import {InjectQueue} from "@nestjs/bull";
import {Queue} from "bull";
import {NotificationType} from "../../../../shared/notification/notification.entity";

@Injectable()
export class AdminProductService {
    constructor(
        @InjectRepository(MarketProduct) private marketProductRepo: Repository<MarketProduct>,
        @InjectRepository(Product) private productRepo: Repository<Product>,
        @InjectRepository(ProductReview) private reviewRepo: Repository<ProductReview>,
        private dataSource: DataSource,
        private readonly i18n: I18nService,
        private notifService: NotificationService,
        @InjectQueue('send-sms') private smsQueue: Queue, // تزریق صف
    ) { }

    /**
     * Retrieve all marketProducts
     */
    async findAll(): Promise<any[]> {
        try {
            const marketProducts = await this.marketProductRepo.find({
                where: { status: MarketProductStatus.PENDING },
                relations: ['tenant', 'product.brand']
            });
            return marketProducts.map(mp => this.mapToResponseObject(mp, mp.product));
        } catch (error) {
            // مدیریت خطاها (مثلاً لاگ کردن خطا)
            console.error('Error in findAll:', error);
            throw error; // خطا را به بالا پرتاب می‌کنیم تا در لایه handler مدیریت شود
        }
    }

    /**
     * Find a single marketProduct by ID
     */
    async findOne(id: string): Promise<any> {
        try {
            const marketProduct = await this.marketProductRepo.findOne({
                where: { id },
                relations: ['tenant','product']
            });
            if (!marketProduct) {
                throw new NotFoundException(await this.i18n.t('error.not_found'));
            }
            return await this.mapToResponseObject(marketProduct, marketProduct.product);
        } catch (error) {
            // مدیریت خطاها (مثلاً لاگ کردن خطا)
            console.error('Error in findOne:', error);
            throw error; // خطا را به بالا پرتاب می‌کنیم تا در لایه handler مدیریت شود
        }
    }

    /**
     * Approve a product request:
     * Updates status in both MarketProduct and global Product tables.
     */
    async approveProduct(productId: string): Promise<any> {
        try {
            return await this.dataSource.transaction(async (manager) => {
                // 1. Find the market product
                const marketProduct = await manager.findOne(MarketProduct, {
                    where: { id: productId },
                    relations: ['tenant','product']
                } as any);
                if (!marketProduct) {
                    throw new NotFoundException(await this.i18n.t('error.not_found'));
                }
                if (marketProduct.status === MarketProductStatus.APPROVED) {
                    throw new BadRequestException(await this.i18n.t('product.already_approved'));
                }
                // 2. Update status in MarketProduct table
                marketProduct.status = MarketProductStatus.APPROVED;
                await manager.save(marketProduct);
                // 3. Update status in global Product table (if exists and belongs to same tenant)
                if (marketProduct.product) {
                    const globalProduct = await manager.findOne(Product, {
                        where: {
                            id: marketProduct.product.id,
                            tenantId: marketProduct.tenantId
                        }
                    } as any);
                    if (globalProduct && globalProduct.status !== ProductStatus.APPROVED) {
                        globalProduct.status = ProductStatus.APPROVED;
                        globalProduct.rejectionReason = '';
                        await manager.save(globalProduct);
                    }
                }
                // 4. Return mapped response

                // ۱. ارسال نوتیفیکیشن
                await this.notifService.create({
                    userId: marketProduct.tenant.ownerUserId,
                    type: NotificationType.IN_APP,
                    title: await this.i18n.t('product.notif.success_title',
                        { args: { name: String(marketProduct.product.name)}}),
                    message: await this.i18n.t('product.notif.success_message',
                        { args: { name: String(marketProduct.product.name) } }),
                    icon: 'ti ti-check text-green-600',
                    color: 'bg-green-100',
                    statusLabel:'success',
                    panelType: `${marketProduct.tenant.type}-ADMIN`
                });

                // ۷. افزودن job به صف
                await this.smsQueue.add('handle-send-sms', {
                    phoneNumber: marketProduct.tenant.phone,
                    message:await this.i18n.t('product.notif.success_message',
                        { args: { name: String(marketProduct.product.name) } }),
                });

                return await this.mapToResponseObject(marketProduct, marketProduct.product);
            });
        } catch (error) {
            // مدیریت خطاها (مثلاً لاگ کردن خطا)
            console.error('Error in approveProduct:', error);
            throw error; // خطا را به بالا پرتاب می‌کنیم تا در لایه handler مدیریت شود
        }
    }

    async revisionProduct(productId: string, reason: string): Promise<any> {
        try {
            const marketProduct = await this.marketProductRepo.findOne({
                where: { id: productId },
                relations: ['tenant','product']
            });
            if (!marketProduct) throw new NotFoundException(await this.i18n.t('error.not_found'));
            marketProduct.status = MarketProductStatus.NEEDS_REVISION;
            marketProduct.rejectionReason = reason;
            await this.marketProductRepo.save(marketProduct);

            if(marketProduct.product) {
                const globalProduct = await this.productRepo.findOne({ where: { id: marketProduct.product.id, tenantId: marketProduct.tenantId }});
                if(globalProduct && globalProduct.status !== ProductStatus.APPROVED) {
                    globalProduct.status = ProductStatus.NEEDS_REVISION;
                    globalProduct.rejectionReason=reason;
                    await this.productRepo.save(globalProduct);
                }
            }
            // ۱. ارسال نوتیفیکیشن
            await this.notifService.create({
                userId: marketProduct.tenant.ownerUserId,
                type: NotificationType.IN_APP,
                title: await this.i18n.t('product.notif.revision_title',
                    { args: { name: String(marketProduct.product.name)}}),
                message: await this.i18n.t('product.notif.revision_message',
                    { args: { reason: reason,name: String(marketProduct.product.name) } }),
                icon: 'ti ti-x text-red-600', // آیکون ضربدر قرمز
                color: 'bg-red-100',
                statusLabel:'warning',
                panelType: `${marketProduct.tenant.type}-ADMIN`
            });

            // ۷. افزودن job به صف
            await this.smsQueue.add('handle-send-sms', {
                phoneNumber: marketProduct.tenant.phone,
                message:await this.i18n.t('product.notif.reject_message',
                    { args: { reason: reason,name: String(marketProduct.product.name) } }),
            });

            return await this.mapToResponseObject(marketProduct, marketProduct.product);
        } catch (error) {
            // مدیریت خطاها (مثلاً لاگ کردن خطا)
            console.error('Error in revisionProduct:', error);
            throw new BadRequestException(await this.i18n.translate('error.server_error'));
            //throw error; // خطا را به بالا پرتاب می‌کنیم تا در لایه handler مدیریت شود
        }
    }

    async rejectProduct(productId: string, reason: string): Promise<any> {
        try {
            // (Reject)
            const marketProduct = await this.marketProductRepo.findOne({
                where: { id: productId },
                relations: ['tenant','product']
            });
            if (!marketProduct) throw new NotFoundException(await this.i18n.t('error.not_found'));
            marketProduct.status = MarketProductStatus.REJECTED;
            marketProduct.rejectionReason = reason;
            await this.marketProductRepo.save(marketProduct);

            if(marketProduct.product) {
                const globalProduct = await this.productRepo.findOne({ where: { id: marketProduct.product.id, tenantId: marketProduct.tenantId }});
                if(globalProduct && globalProduct.status !== ProductStatus.APPROVED) {
                    globalProduct.status = ProductStatus.REJECTED;
                    globalProduct.rejectionReason=reason;
                    await this.productRepo.save(globalProduct);
                }
            }
            // ۱. ارسال نوتیفیکیشن
            await this.notifService.create({
                userId: marketProduct.tenant.ownerUserId,
                type: NotificationType.IN_APP,
                title: await this.i18n.t('product.notif.reject_title',
                    { args: { name: String(marketProduct.product.name)}}),
                message: await this.i18n.t('product.notif.reject_message',
                    { args: { reason: reason,name: String(marketProduct.product.name) } }),
                icon: 'ti ti-x text-red-600', // آیکون ضربدر قرمز
                color: 'bg-red-100',
                statusLabel:'error',
                panelType: `${marketProduct.tenant.type}-ADMIN`
            });

            // ۷. افزودن job به صف
            await this.smsQueue.add('handle-send-sms', {
                phoneNumber: marketProduct.tenant.phone,
                message:await this.i18n.t('product.notif.reject_message',
                    { args: { reason: reason,name: String(marketProduct.product.name) } }),
            });
            return await this.mapToResponseObject(marketProduct, marketProduct.product);
        } catch (error) {
            // مدیریت خطاها (مثلاً لاگ کردن خطا)
            console.error('Error in rejectProduct:', error);
            throw new BadRequestException(await this.i18n.translate('error.server_error'));
            //throw error; // خطا را به بالا پرتاب می‌کنیم تا در لایه handler مدیریت شود
        }
    }

    /**
     * Helper function to map MarketProduct + Product to a single object
     */
    private mapToResponseObject(marketProduct: MarketProduct, baseProduct: Product): any {
        if (!baseProduct) return marketProduct;

        return {
            // --- Tenant-Specific Fields ---
            id: marketProduct.id,
            tenantId: marketProduct.tenantId,
            price: marketProduct.price,
            stock: marketProduct.stock,
            isActive: marketProduct.isActive,
            hasDiscount: marketProduct.hasDiscount,
            discountValue: marketProduct.discountValue,
            discountType: marketProduct.discountType,
            discountedPrice: marketProduct.discountedPrice,
            hasExpiryDate: marketProduct.hasExpiryDate,
            expiryDate: marketProduct.expiryDate,
            discountStartDate: marketProduct.discountStartDate,
            discountEndDate: marketProduct.discountEndDate,
            averageRating: marketProduct.averageRating,
            reviewsCount: marketProduct.reviewsCount,
            rejectionReason:marketProduct.rejectionReason,
            status:marketProduct.status,
            description: marketProduct.description,
            createdAt: marketProduct.createdAt,
            updatedAt: marketProduct.updatedAt,
            tenant:marketProduct.tenant.name||marketProduct.tenant.ownerName,

            // --- Global Fields (Merged from Base Product) ---
            name: baseProduct.name,
            code: baseProduct.code,
            image: baseProduct.image,
            galleryImages: baseProduct.galleryImages,
            brand: baseProduct.brand?.name,
            category: baseProduct.category,
            categoryId: baseProduct.categoryId,
            rejectionReasonGlobal:baseProduct.rejectionReason,
            categoryBreadcrumb:baseProduct.categoryBreadcrumb,
            type: baseProduct.type,
            //status: baseProduct.status
        };
    }

    /**
     * دریافت لیست نظرات در انتظار تایید
     */
    async findAllPendingReviews(): Promise<any[]> {
        try {
            const reviews = await this.reviewRepo.find({
                where: { isApproved: false },
                order: { createdAt: 'DESC' }, // جدیدترین‌ها در بالا
                relations: ['user', 'marketProduct.product'] // روابط مورد نیاز برای نمایش نام کاربر و محصول
            });
            return reviews.map(review => ({
                id: review.id,
                rating: review.rating,
                comment: review.comment,
                createdAt: review.createdAt,
                // اطمینان از وجود آبجکت‌های مرتبط قبل از دسترسی
                userName: review.user?.fullName || 'کاربر ناشناس',
                productName: review.marketProduct?.product.name || 'محصول حذف شده',
                productId: review.productId,
                userId: review.userId
            }));
        } catch (error) {
            // مدیریت خطاها (مثلاً لاگ کردن خطا)
            console.error('Error in findAllPendingReviews:', error);
            throw error; // خطا را به بالا پرتاب می‌کنیم تا در لایه handler مدیریت شود
        }
    }

    /**
     * تایید نظر
     */
    async approveReview(reviewId: string): Promise<any> {
        try {
            const review = await this.reviewRepo.findOne({ where: { id: reviewId } });
            if (!review) {
                throw new NotFoundException(await this.i18n.t('error.not_found'));
            }
            review.isApproved = true;
            await this.reviewRepo.save(review);
            return { message: 'Review approved successfully', review };
        } catch (error) {
            // مدیریت خطاها (مثلاً لاگ کردن خطا)
            console.error('Error in approveReview:', error);
            throw error; // خطا را به بالا پرتاب می‌کنیم تا در لایه handler مدیریت شود
        }
    }

    /**
     * رد نظر
     */
    async rejectReview(reviewId: string): Promise<any> {
        try {
            const review = await this.reviewRepo.findOne({ where: { id: reviewId } });
            if (!review) {
                throw new NotFoundException(await this.i18n.t('error.not_found'));
            }
            // حذف نظر از دیتابیس
            await this.reviewRepo.remove(review);
            return { message: 'Review rejected and removed successfully' };
        } catch (error) {
            // مدیریت خطاها (مثلاً لاگ کردن خطا)
            console.error('Error in rejectReview:', error);
            throw error; // خطا را به بالا پرتاب می‌کنیم تا در لایه handler مدیریت شود
        }
    }

}