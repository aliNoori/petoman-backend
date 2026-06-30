import {ApiBearerAuth, ApiOperation, ApiTags} from "@nestjs/swagger";
import {Controller, Get, Param, Post} from "@nestjs/common";
import {TenantRatingService} from "./tenant-rating.service";

@ApiTags('Tenant Ratings')
@ApiBearerAuth()
@Controller('tenants/:tenantId/rating')
export class TenantRatingController {
    constructor(
        private ratingService: TenantRatingService,
    ) {}

    /**
     * Get tenant rating & review count
     */
    @Get()
    @ApiOperation({summary: 'Get average rating & reviews count for a tenant'})
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
