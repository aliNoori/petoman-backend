import {ApiBearerAuth, ApiOperation, ApiParam, ApiTags} from "@nestjs/swagger";
import {Body, Controller, Get, Param, Patch, Post, UseGuards} from "@nestjs/common";
import {TenantReviewService} from "./tenant-review.service";
import {JwtAuthGuard} from "../auth/guards/jwt-auth.guard";
import {BlacklistGuard} from "../auth/guards/blacklist.guard";

@ApiTags('Tenant Reviews')
@ApiBearerAuth()
@Controller('tenants/reviews')
export class TenantReviewController {
    constructor(private reviewService: TenantReviewService) {}

    /**
     * Get shop reviews
     */
    @Get()
    @ApiOperation({
        summary: 'Get shop reviews',
    })
    @UseGuards(JwtAuthGuard,BlacklistGuard)
    list() {
        return this.reviewService.getTenantReviews();
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
