import {Injectable, NotFoundException} from "@nestjs/common";

import {DataSource, Repository} from "typeorm";
import {ShopReview} from "../../../market/review/shop-review.entity";
import {TenantContext} from "../../../../tenants/tenant-context.service";
import {TenantReview} from "../../../../shared/reviews/tenant-review.entity";


@Injectable()
export class PharmacyReviewService {
    private reviewRepository: Repository<ShopReview>;

    constructor(private dataSource: DataSource,
                private tenantContext: TenantContext,) {
        this.reviewRepository = this.dataSource.getRepository(TenantReview);
    }


    /**
     * Get reviews of a shop
     */
    async getPharmacyReviews() {
        const tenantId = this.tenantContext.getTenantId();

        return this.dataSource.getRepository(TenantReview).find({
            where: {
                tenantId,
                isApproved: true,
            },
            relations: ['user'],
            order: {createdAt: 'DESC'},
        });
    }

    /**
     * Submit reply to a review
     */
    async submitReply(reviewId: string, replyText: string) {
        // استفاده از findOne برای دریافت یک آبجکت
        const review = await this.reviewRepository.findOne({
            where: {id: reviewId}
        });

        if (!review) {
            throw new NotFoundException('نظر مورد نظر یافت نشد');
        }

        // آپدیت فیلدها
        review.reply = replyText;
        //review.replyUpdatedAt = new Date();

        // ذخیره تغییرات
        return this.reviewRepository.save(review);
    }
}
