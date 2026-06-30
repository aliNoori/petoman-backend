import {Injectable} from '@nestjs/common';
import {DataSource, In} from 'typeorm';
import {MarketProduct, MarketProductStatus} from "../../product/entities/product.entity";
import {Product, ProductStatus} from "../../../../shared/product/product.entity";
import {ProductLike} from "../../product/entities/product-like.entity";


@Injectable()
export class UserProductService {
    constructor(
        private readonly dataSource: DataSource,
    ) {}

    /**
     * 🛒 Fetch all products for the tenant, merging global details with local shop specifics
     */
    async getProducts(userId?: string): Promise<any[]> {
        const marketRepo = this.dataSource.getRepository(MarketProduct);
        const likeRepo = this.dataSource.getRepository(ProductLike); // ریپازیتوری لایک

        // ۱. دریافت محصولات (بدون تغییر در روش قبلی)
        const marketProducts = await marketRepo.find({
            where: {
                status: In([MarketProductStatus.APPROVED]),
            },
            relations: [
                'product.brand',
                'product.category.products.marketProducts',
                'reviews.user',
                'variants',
                'features',
                'specifications',
                'tenant'
            ],
            order: { createdAt: 'DESC' },
        });

        // ۲. اگر کاربر لاگین است، وضعیت لایک‌های او را برای این محصولات پیدا کن
        let userLikesMap = new Map<string, boolean>(); // Map<productId, isLike>

        if (userId && marketProducts.length > 0) {
            // استخراج آیدی محصولات
            const productIds = marketProducts.map(mp => mp.id);

            // پیدا کردن لایک‌های کاربر برای این لیست محصول
            const likes = await likeRepo.find({
                where: {
                    userId: userId,
                    productId: In(productIds) as any, // استفاده از In برای فیلتر چندگانه
                },
                select: ['productId', 'isLike'] // فقط فیلدهای لازم را بگیر برای سرعت
            });

            // پر کردن Map
            likes.forEach(like => {
                userLikesMap.set(like.productId, like.isLike);
            });
        }

        // ۳. Merge fields
        return marketProducts.map((mp) => {
            const baseProduct = mp.product;
            const tenant = mp.tenant;
            const reviews = mp.reviews;
            const variants = mp.variants;
            const features = mp.features;
            const specifications = mp.specifications;
            const seller = mp.tenant;

            // دریافت وضعیت لایک از Map (اگر وجود نداشت پیش‌فرض false)
            const isLiked = userLikesMap.get(mp.id) || false;

            return {
                // --- Tenant-Specific Fields (MarketProduct) ---
                id: mp.id,
                tenantId: mp.tenantId,
                price: mp.price,
                description: mp?.description,
                stock: mp.stock,
                isActive: mp.isActive,
                hasDiscount: mp.hasDiscount,
                discountValue: mp.discountValue,
                discountType: mp.discountType,
                discountedPrice: mp.discountedPrice,
                hasExpiryDate: mp.hasExpiryDate,
                expiryDate: mp.expiryDate,
                discountStartDate: mp.discountStartDate,
                discountEndDate: mp.discountEndDate,
                averageRating: mp.average_rating,
                reviewsCount: mp.reviews_count,
                status: mp.status,

                // --- ست کردن وضعیت لایک ---
                isFavorite: isLiked,

                rejectionReason: mp.rejectionReason,
                createdAt: mp.createdAt,
                updatedAt: mp.updatedAt,

                // --- Global Fields (Product) ---
                name: baseProduct?.name,
                code: baseProduct?.code,
                image: baseProduct?.image,
                galleryImages: baseProduct?.galleryImages,
                brand: baseProduct?.brand,
                categoryBreadcrumb: baseProduct.categoryBreadcrumb,
                category: baseProduct?.category,
                categoryId: baseProduct?.categoryId,
                type: baseProduct?.type,

                //Product tenant
                shopId: tenant.id,
                shopName: tenant.name,
                shopLocation: tenant.location,
                shopCategories: tenant.categories,

                //Reviews product
                reviews: reviews,
                variants: variants,
                features: features,
                specifications: specifications,
                seller: seller
            };
        });
    }

    /**
     * Get all globalProducts for tenant
     */
    async getGlobalProducts(): Promise<Product[]> {
        return this.dataSource.getRepository(Product).find({
            where:{status:ProductStatus.APPROVED},
            order: { createdAt: 'DESC' },
        } as any);
    }

    /**
     * ثبت یا تغییر وضعیت لایک/دیس‌لایک
     */
    async toggleLike(userId: string, productId: string, isLike: boolean) {
        const likeRepo = this.dataSource.getRepository(ProductLike);

        // بررسی وجود رکورد قبلی
        const existingLike = await likeRepo.findOne({
            where: { userId, productId }
        });

        if (existingLike) {
            // اگر کاربر قبلاً همین حالت (لایک یا دیسلایک) را ثبت کرده، آن را حذف می‌کنیم (Undo)
            if (existingLike.isLike === isLike) {
                await likeRepo.remove(existingLike);
                return { message: isLike ? 'لایک برداشته شد' : 'دیس‌لایک برداشته شد', action: 'removed' };
            } else {
                // اگر وضعیت متفاوت است (مثلاً قبلا لایک کرده، حالا دیسلایک می‌کند)، آپدیت می‌کنیم
                existingLike.isLike = isLike;
                await likeRepo.save(existingLike);
                return { message: isLike ? 'لایک شد' : 'دیس‌لایک شد', action: 'updated' };
            }
        } else {
            // اگر رکوردی وجود ندارد، جدید می‌سازیم
            const newLike = likeRepo.create({ userId, productId, isLike });
            await likeRepo.save(newLike);
            return { message: isLike ? 'لایک شد' : 'دیس‌لایک شد', action: 'created' };
        }
    }

    /**
     * دریافت وضعیت لایک کاربر برای یک محصول
     */
    async getUserLikeStatus(userId: string, productId: string) {
        const likeRepo = this.dataSource.getRepository(ProductLike);
        const like = await likeRepo.findOne({ where: { userId, productId } });

        if (!like) return { liked: false, disliked: false };

        return {
            liked: like.isLike === true,
            disliked: like.isLike === false,
        };
    }
}
