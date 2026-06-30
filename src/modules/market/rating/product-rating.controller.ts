import {ApiBearerAuth, ApiOperation, ApiTags} from "@nestjs/swagger";
import {Controller, Get, Param, Post} from "@nestjs/common";
import {ProductRatingService} from "./product-rating.service";
import {TenantContext} from "../../../tenants/tenant-context.service";

@ApiTags('Market Product Ratings')
@ApiBearerAuth()
@Controller('market/products/:productId/rating')
export class ProductRatingController {
    constructor(
        private ratingService: ProductRatingService,
        private tenantContext: TenantContext
    ) {}

    /**
     * Get product rating & review count
     */
    @Get()
    @ApiOperation({summary: 'Get average rating & reviews count for a product'})
    getRating(@Param('productId') productId: string) {
        const tenantId = this.tenantContext.getTenantId();
        return this.ratingService.getProductRating(productId, tenantId);
    }

    /**
     * Recalculate ratings manually (optional)
     */
    @Post('recalc')
    @ApiOperation({summary: 'Recalculate average rating & review count'})
    recalc(@Param('productId') productId: string) {
        const tenantId = this.tenantContext.getTenantId();
        return this.ratingService.recalcProductRating(productId, tenantId);
    }
}
