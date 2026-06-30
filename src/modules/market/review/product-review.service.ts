import {ProductReview} from "./product-review.entity";
import {BadRequestException, Injectable} from "@nestjs/common";
import {OrderStatus} from "../../../shared/order/order-status.enum";
import {Order} from "../../../shared/order/order.entity";
import {CreateReviewDto} from "./create-review.dto";
import {ProductOrderItem} from "../order/product-order-item.entity";
import {DataSource} from "typeorm";
import {TenantContext} from "../../../tenants/tenant-context.service";
import {MarketProduct} from "../product/entities/product.entity";

@Injectable()
export class ProductReviewService {
    constructor(private dataSource: DataSource,
                private tenantContext: TenantContext) {
    }

    /**
     * Get reviews of a product
     */
    async getProductReviews(productId: string) {
        const tenantId = this.tenantContext.getTenantId();

        return this.dataSource.getRepository(ProductReview).find({
            where: {
                tenantId,
                productId,
                isApproved: true,
            },
            order: {createdAt: 'DESC'},
        });
    }

    async createReview(
        userId: string,
        productId: string,
        dto: CreateReviewDto,
    ) {
        return this.dataSource.transaction(async (manager) => {
            // 1. Fetch product to verify existence and retrieve tenantId
            const product = await manager.findOne(MarketProduct, {
                where: { id: productId },
                select: ['id', 'tenantId']
            } as any);
            if (!product) {
                throw new BadRequestException('Product not found');
            }
            const tenantId = product.tenantId;

            /** 2️⃣ Find the eligible order based on user, product, and (optionally) variant */
            const orderItemWhere: any = {
                productId,
                // --- اصلاح مهم: استفاده از رابطه برای دسترسی به userId ---
                // چون userId در جدول Order است، باید بنویسیم order.userId
                order: {
                    userId: userId
                }
            };

            if (dto.variantId) {
                orderItemWhere.variantId = dto.variantId;
            }

            const orderItem = await manager.findOne(ProductOrderItem, {
                where: orderItemWhere,
                relations: ['order'], // حتماً باید رابطه لود شود تا فیلتر بالا کار کند
            } as any);

            // Validate that the order exists, belongs to the user and tenant, and is PAID
            const order = orderItem?.order &&
            orderItem.order.userId === userId &&
            orderItem.order.tenantId === tenantId &&
            orderItem.order.status === OrderStatus.CUSTOMER_DELIVERED
                ? orderItem.order
                : null;


            if (!order) {
                throw new BadRequestException('Order is not eligible for review (Not found, not paid, or does not belong to user/tenant)');
            }
            const orderId = order.id;

            /** 3️⃣ Prevent duplicate review */
            const reviewWhere: any = {
                orderId,
                productId,
            };
            if (dto.variantId) {
                reviewWhere.variantId = dto.variantId;
            }

            const exists = await manager.findOne(ProductReview, {
                where: reviewWhere,
            });

            if (exists) {
                throw new BadRequestException('Review already submitted for this product in this order');
            }

            /** 4️⃣ Create review */
            const review = manager.create(ProductReview, {
                tenantId,
                orderId,
                productId,
                userId,
                variantId: dto.variantId,
                rating: dto.rating,
                comment: dto.comment,
                title: dto.title,
                pros: dto.pros,
                cons: dto.cons,
                isApproved: false,
                recommended: dto.recommended
            });

            return manager.save(review);
        });
    }

    // در ProductReviewService
    async updateReview(reviewId: string, dto: CreateReviewDto, userId: string) {
        const repo = this.dataSource.getRepository(ProductReview);
        const review = await repo.findOne({where: {id: reviewId, userId}});
        if (!review) throw new BadRequestException('Review not found');

        review.title = dto.title
        review.rating = dto.rating;
        review.comment = dto.comment;
        review.cons = dto.cons;
        review.pros = dto.pros;
        review.recommended = dto.recommended;
        return repo.save(review);
    }

    async deleteReview(reviewId: string, userId: string) {
        const repo = this.dataSource.getRepository(ProductReview);
        const review = await repo.findOne({ where: { id: reviewId, userId } });

        if (!review) {
            throw new BadRequestException('Review not found');
        }

        await repo.remove(review);
        return { message: 'Review deleted successfully' };
    }

    /**
     * Toggle Like/Dislike on a review
     * @param reviewId ID نظر
     * @param userId ID کاربر فعلی
     * @param type 'like' یا 'dislike'
     */
    // product-review.service.ts

    async toggleReviewReaction(reviewId: string, userId: string, type: 'like' | 'dislike') {
        const repo = this.dataSource.getRepository(ProductReview);
        const review = await repo.findOne({ where: { id: reviewId } });

        if (!review) {
            throw new BadRequestException('Review not found');
        }

        // مقداردهی اولیه آرایه‌ها
        review.likesByUsers = review.likesByUsers || [];
        review.dislikesByUsers = review.dislikesByUsers || [];

        // حذف مقدار رشته‌ای "[]" اگر وجود دارد
        if (review.likesByUsers.length === 1 && review.likesByUsers[0] === '[]') {
            review.likesByUsers = [];
        }
        if (review.dislikesByUsers.length === 1 && review.dislikesByUsers[0] === '[]') {
            review.dislikesByUsers = [];
        }

        const isLiked = review.likesByUsers.includes(userId);
        const isDisliked = review.dislikesByUsers.includes(userId);

        if (type === 'like' && isLiked) {
            review.likesByUsers = review.likesByUsers.filter(id => id !== userId);
            review.likesCount = Math.max(0, review.likesCount - 1);
        } else if (type === 'dislike' && isDisliked) {
            review.dislikesByUsers = review.dislikesByUsers.filter(id => id !== userId);
            review.dislikesCount = Math.max(0, review.dislikesCount - 1);
        } else if (type === 'like' && isDisliked) {
            review.dislikesByUsers = review.dislikesByUsers.filter(id => id !== userId);
            review.dislikesCount = Math.max(0, review.dislikesCount - 1);
            review.likesByUsers.push(userId);
            review.likesCount += 1;
        } else if (type === 'dislike' && isLiked) {
            review.likesByUsers = review.likesByUsers.filter(id => id !== userId);
            review.likesCount = Math.max(0, review.likesCount - 1);
            review.dislikesByUsers.push(userId);
            review.dislikesCount += 1;
        } else {
            if (type === 'like') {
                review.likesByUsers.push(userId);
                review.likesCount += 1;
            } else {
                review.dislikesByUsers.push(userId);
                review.dislikesCount += 1;
            }
        }

        await repo.save(review);

        return {
            success: true,
            review: review // کل نظر آپدیت شده را برگردان
        };
    }
}
