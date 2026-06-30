import {ApiBearerAuth, ApiOperation, ApiParam, ApiTags} from "@nestjs/swagger";
import {Body, Controller, Get, Param, Patch, Post, UseGuards} from "@nestjs/common";
import {JwtAuthGuard} from "../../../shared/auth/guards/jwt-auth.guard";
import {ShopReviewService} from "./shop-review.service";
import {BlacklistGuard} from "../../../shared/auth/guards/blacklist.guard";

@ApiTags('Market Reviews')
@ApiBearerAuth()
@Controller('market/shops/reviews')
export class ShopReviewController {
    constructor(private reviewService: ShopReviewService) {}

    /**
     * Get shop reviews
     */
    @Get()
    @ApiOperation({
        summary: 'Get shop reviews',
    })
    @UseGuards(JwtAuthGuard,BlacklistGuard)
    list() {
        return this.reviewService.getShopReviews();
    }

    /**
     * Reply to a review
     */
    @Patch(':id/reply')
    @ApiOperation({ summary: 'Reply to a review' })
    @ApiParam({ name: 'id', description: 'Review ID' })
    @UseGuards(JwtAuthGuard,BlacklistGuard)
    reply(@Param('id') id: string, @Body() body: { reply: string }) {
        return this.reviewService.submitReply(id, body.reply);
    }
}
