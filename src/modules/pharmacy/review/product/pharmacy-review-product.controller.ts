import {ApiBearerAuth, ApiOperation, ApiParam, ApiTags} from "@nestjs/swagger";
import {Body, Controller, Get, Param, Patch, Post, UseGuards, Request, Delete} from "@nestjs/common";

import {PharmacyProductReviewService} from "./pharmacy-review-product.service";
import {JwtAuthGuard} from "../../../../shared/auth/guards/jwt-auth.guard";
import {CreateReviewDto} from "../../../market/review/create-review.dto";
import {CurrentUser} from "../../../../shared/auth/guards/current-user.decorator";
import {User} from "../../../../shared/user/entities/user.entity";
import {BlacklistGuard} from "../../../../shared/auth/guards/blacklist.guard";

@ApiTags('Pharmacy Reviews')
@ApiBearerAuth()
@Controller('products')
export class PharmacyProductReviewController {
    constructor(private reviewService: PharmacyProductReviewService) {}

    /**
     * Get product reviews
     */
    @Get('/me')
    @ApiOperation({
        summary: 'Get product reviews',
    })
    @UseGuards(
        JwtAuthGuard,
    )
    list(@Param('productId') productId: string) {
        return this.reviewService.getProductReviews(productId);
    }

    /**
     * Submit review for a purchased product
     */
    @Post(':productId/reviews')
    @ApiOperation({
        summary: 'Submit review for purchased product',
    })
    @ApiParam({ name: 'productId' })
    create(
        @Param('productId') productId: string,
        @Body() dto: CreateReviewDto,
        @CurrentUser() user:User
    ) {
        return this.reviewService.createReview(user.id, productId, dto);
    }

    /**
     * ویرایش نظر محصول
     */
    @Patch(':reviewId/reviews')
    @UseGuards(JwtAuthGuard,BlacklistGuard)
    @ApiOperation({
        summary: 'Update a product review',
    })
    @UseGuards(
        JwtAuthGuard,
    )
    async updateReview(
        @Param('reviewId') reviewId: string,
        @Body() dto: CreateReviewDto,@Request() req) {

        const userId = req.user?.id;

        return this.reviewService.updateReview(
            reviewId,
            dto,
            userId
        );
    }

    /**
     * حذف نظر محصول
     */
    @Delete(':reviewId/reviews')
    @UseGuards(JwtAuthGuard,BlacklistGuard)
    @ApiOperation({ summary: 'Delete a product review' })
    @ApiParam({ name: 'reviewId' })
    async deleteReview(
        @Param('reviewId') reviewId: string,
        @Request() req
    ) {
        const userId = req.user?.id;
        return this.reviewService.deleteReview(
            reviewId,
            userId
        );
    }
}
