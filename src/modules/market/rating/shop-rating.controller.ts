import {ApiBearerAuth, ApiOperation, ApiTags} from "@nestjs/swagger";
import {Controller, Get, Param, Post} from "@nestjs/common";
import {ShopRatingService} from "./shop-rating.service";

@ApiTags('Market Shop Ratings')
@ApiBearerAuth()
@Controller('shops/:tenantId/rating')
export class ShopRatingController {
    constructor(
        private ratingService: ShopRatingService,
    ) {}

    /**
     * Get shop rating & review count
     */
    @Get()
    @ApiOperation({summary: 'Get average rating & reviews count for a shop'})
    getRating(@Param('tenantId') tenantId: string) {

        return this.ratingService.getShopRating(tenantId);
    }

    /**
     * Recalculate ratings manually (optional)
     */
    @Post('recalc')
    @ApiOperation({summary: 'Recalculate average rating & review count'})
    recalc(@Param('tenantId') tenantId: string) {

        return this.ratingService.recalcShopRating(tenantId);
    }
}
