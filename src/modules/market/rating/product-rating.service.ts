import {Injectable, NotFoundException} from "@nestjs/common";
import {MarketProduct} from "../product/entities/product.entity";
import {ProductReview} from "../review/product-review.entity";
import {DataSource} from "typeorm";

@Injectable()
export class ProductRatingService {
    constructor(private dataSource: DataSource) {}

    /**
     * Recalculate average rating & review count for a product
     */
    async recalcProductRating(productId: string, tenantId: string) {
        const repo = this.dataSource.getRepository(ProductReview);

        // Aggregate query
        const result = await repo
            .createQueryBuilder('review')
            .select('AVG(review.rating)', 'avg')
            .addSelect('COUNT(review.id)', 'count')
            .where('review.productId = :productId', { productId })
            .andWhere('review.tenantId = :tenantId', { tenantId })
            .andWhere('review.isApproved = true')
            .getRawOne<{ avg: string; count: string }>();

        const avg = result?.avg ?? '0';
        const count = result?.count ?? '0';


        const productRepo = this.dataSource.getRepository(MarketProduct);
        const product = await productRepo.findOne({
            where: { id: productId, tenantId },
        });

        if (!product) throw new NotFoundException('Product not found');

        product.averageRating = parseFloat(avg) || 0;
        product.reviewsCount = parseInt(count) || 0;

        await productRepo.save(product);

        return product;
    }

    /**
     * Get product rating (real-time)
     */
    async getProductRating(productId: string, tenantId: string) {
        const product = await this.dataSource.getRepository(MarketProduct).findOne({
            where: { id: productId, tenantId },
            select: ['id', 'averageRating', 'reviewsCount'],
        });

        if (!product) throw new NotFoundException('Product not found');

        return product;
    }
}
