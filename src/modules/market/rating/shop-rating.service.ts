import {Injectable, NotFoundException} from "@nestjs/common";
import {MarketProduct} from "../product/entities/product.entity";
import {ProductReview} from "../review/product-review.entity";
import {DataSource} from "typeorm";
import {Tenant} from "../../../core/entities/tenant.entity";
import {ShopReview} from "../review/shop-review.entity";

@Injectable()
export class ShopRatingService {
    constructor(private dataSource: DataSource) {}

    /**
     * Recalculate average rating & review count for a shop
     */
    async recalcShopRating(tenantId: string) {
        const repo = this.dataSource.getRepository(ShopReview);

        // Aggregate query
        const result = await repo
            .createQueryBuilder('review')
            .select('AVG(review.rating)', 'avg')
            .addSelect('COUNT(review.id)', 'count')
            .where('review.tenantId = :tenantId', { tenantId })
            .andWhere('review.isApproved = true')
            .getRawOne<{ avg: string; count: string }>();

        const avg = result?.avg ?? '0';
        const count = result?.count ?? '0';


        const shopRepo = this.dataSource.getRepository(Tenant);
        const shop = await shopRepo.findOne({
            where: { id:tenantId },
        });

        if (!shop) throw new NotFoundException('Shop not found');

        shop.rating = parseFloat(avg) || 0;
        shop.reviewsCount = parseInt(count) || 0;

        await shopRepo.save(shop);

        return shop;
    }

    /**
     * Get shop rating (real-time)
     */
    async getShopRating(tenantId: string) {
        const shop = await this.dataSource.getRepository(Tenant).findOne({
            where: { id:tenantId },
            select: ['id', 'rating', 'reviewsCount'],
        });

        if (!shop) throw new NotFoundException('Shop not found');

        return shop;
    }
}
