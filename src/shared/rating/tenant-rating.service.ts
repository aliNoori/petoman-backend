import {Injectable, NotFoundException} from "@nestjs/common";
import {DataSource} from "typeorm";
import {Tenant} from "../../core/entities/tenant.entity";
import {TenantReview} from "../reviews/tenant-review.entity";


@Injectable()
export class TenantRatingService {
    constructor(private dataSource: DataSource) {}

    /**
     * Recalculate average rating & review count for a shop
     */
    async recalcShopRating(tenantId: string) {
        const repo = this.dataSource.getRepository(TenantReview);

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


        const tenantRepo = this.dataSource.getRepository(Tenant);
        const tenant = await tenantRepo.findOne({
            where: { id:tenantId },
        });

        if (!tenant) throw new NotFoundException('Tenant not found');

        tenant.rating = parseFloat(avg) || 0;
        tenant.reviewsCount = parseInt(count) || 0;

        await tenantRepo.save(tenant);

        return tenant;
    }

    /**
     * Get shop rating (real-time)
     */
    async getShopRating(tenantId: string) {
        const tenant = await this.dataSource.getRepository(Tenant).findOne({
            where: { id:tenantId },
            select: ['id', 'rating', 'reviewsCount'],
        });

        if (!tenant) throw new NotFoundException('Tenant not found');

        return tenant;
    }
}
