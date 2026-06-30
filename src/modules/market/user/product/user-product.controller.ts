import {
    Body,
    Controller, Delete,
    Get, Param, Patch,
    Post, Req,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';
import {UserProductService} from "./user-product.service";
import {CurrentUser} from "../../../../shared/auth/guards/current-user.decorator";
import {User} from "../../../../shared/user/entities/user.entity";
import {JwtAuthGuard} from "../../../../shared/auth/guards/jwt-auth.guard";


@ApiTags('Market / Products')
@ApiBearerAuth()
@Controller('user/products')
export class UserProductController {
    constructor(
        private readonly productService: UserProductService,
    ) {}

    @Get()
    @ApiOperation({ summary: 'Get all products' })
    //@UseGuards(JwtAuthGuard,BlacklistGuard)
    findAll(@Req() req) {
        return this.productService.getProducts(req.user?.id);
    }

    @Get('global')
    @ApiOperation({ summary: 'Get all globalProducts' })
    findAllGlobalProducts() {
        return this.productService.getGlobalProducts();
    }

    @Post(':id/like')
    @ApiOperation({ summary: 'لایک یا دیس‌لایک کردن محصول' })
    async toggleLike(
        @Param('id') productId: string,
        @Body('isLike') isLike: boolean, // مقدار true برای لایک، false برای دیس‌لایک
        @CurrentUser() user: User
    ) {
        return this.productService.toggleLike(user.id, productId, isLike);
    }

    @Get(':id/like-status')
    @ApiOperation({ summary: 'دریافت وضعیت لایک کاربر جاری برای یک محصول' })
    async getLikeStatus(
        @Param('id') productId: string,
        @CurrentUser() user: User
    ) {
        return this.productService.getUserLikeStatus(user.id, productId);
    }
}