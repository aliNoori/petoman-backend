import {ApiBearerAuth, ApiOperation, ApiParam, ApiTags} from "@nestjs/swagger";
import {Body, Controller, Get, Param, Patch, Post, UseGuards} from "@nestjs/common";
import {PharmacyReviewService} from "./pharmacy-review.service";
import {JwtAuthGuard} from "../../../../shared/auth/guards/jwt-auth.guard";
import {BlacklistGuard} from "../../../../shared/auth/guards/blacklist.guard";

@ApiTags('Pharmacy Reviews')
@ApiBearerAuth()
@Controller('pharmacy/reviews')
export class PharmacyReviewController {
    constructor(private reviewService: PharmacyReviewService) {}

    /**
     * Get shop reviews
     */
    @Get('/all-reviews')
    @ApiOperation({
        summary: 'Get pharmacy reviews',
    })
    @UseGuards(JwtAuthGuard,BlacklistGuard)
    list() {
        return this.reviewService.getPharmacyReviews();
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
