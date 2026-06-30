import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Request,
    HttpStatus,
    HttpCode
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from "../../../../shared/auth/guards/jwt-auth.guard";
import {AdminGuard} from "../../../../shared/auth/guards/admin-guard";
import {AdminProductService} from "./admin-product.service";
import {AdminReasonDto} from "./dto/admin.reason.dto";
import {Permissions} from "../../../../shared/auth/decorators/permissions.decorator";
import {I18nService} from "nestjs-i18n";

@ApiTags('Market / Shops')
@ApiBearerAuth()

@UseGuards(JwtAuthGuard,AdminGuard)
@Permissions('tenant.manage')

@Controller('admin/products')
export class AdminProductController {
    constructor(
        private readonly productService: AdminProductService,
        private readonly i18n: I18nService,
    ) {}

    // --- Product Management (Existing) ---
    @Get()
    @ApiOperation({ summary: 'Get all products' })
    async findAllProducts() {
        return await this.productService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a product by ID' })
    async findOneProduct(@Param('id') id: string) {
        return await this.productService.findOne(id);
    }

    @Patch(':id/approve')
    @ApiOperation({ summary: 'Approve a product request and verified it' })
    async approveProduct(@Param('id') id: string) {
        return await this.productService.approveProduct(id);
    }
    @Patch(':id/revision')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Product revision' })
    async revisionProduct(@Param('id') id: string, @Body() reasonDto: AdminReasonDto) {
        return {
            statusCode: HttpStatus.OK,
            message: await this.i18n.translate('product.revision_success'),
            data: await this.productService.revisionProduct(id, reasonDto.reason)
        };
    }

    @Patch(':id/reject')
    @ApiOperation({ summary: 'Reject a new product request' })
    @HttpCode(HttpStatus.OK)
    async rejectProduct(@Param('id') id: string, @Body() reasonDto: AdminReasonDto) {
        return {
            statusCode: HttpStatus.OK,
            message: await this.i18n.translate('product.reject_success'),
            data: await this.productService.rejectProduct(id, reasonDto.reason)
        };
    }

    // --- Review Management ---
    @Get('reviews/pending')
    @ApiOperation({ summary: 'Get all pending reviews' })
    async findAllPendingReviews() {

        return this.productService.findAllPendingReviews();
    }

    /**
     * تایید نظر
     */
    @Patch('reviews/:reviewId/approve')
    @ApiOperation({ summary: 'Approve a review' })
    async approveReview(@Param('reviewId') reviewId: string) {
        return await this.productService.approveReview(reviewId);
    }

    /**
     * رد نظر
     */
    @Patch('reviews/:reviewId/reject')
    @ApiOperation({ summary: 'Reject a review' })
    async rejectReview(@Param('reviewId') reviewId: string) {
        return await this.productService.rejectReview(reviewId);
    }
}