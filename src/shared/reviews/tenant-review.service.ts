import {Injectable, NotFoundException} from "@nestjs/common";
import {TenantReview} from "./tenant-review.entity";
import {DataSource, Repository} from "typeorm";
import {TenantContext} from "../../tenants/tenant-context.service";

@Injectable()
export class TenantReviewService {
    private reviewRepository: Repository<TenantReview>;

    constructor(private dataSource: DataSource,
                private tenantContext: TenantContext,) {
        this.reviewRepository = this.dataSource.getRepository(TenantReview);
    }


    /**
     * Get reviews of a shop
     */
    async getTenantReviews() {
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
