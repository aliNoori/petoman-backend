import {
    BadRequestException,
    Controller,
    DefaultValuePipe,
    Get,
    NotFoundException,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
    Request,
    UseGuards
} from '@nestjs/common';
import {ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags} from '@nestjs/swagger';
import {JwtAuthGuard} from "../../../../shared/auth/guards/jwt-auth.guard";
import {UserOrderService} from "./user-order.service";
import {CurrentUser} from "../../../../shared/auth/guards/current-user.decorator";
import {User} from "../../../../shared/user/entities/user.entity";
import {BlacklistGuard} from "../../../../shared/auth/guards/blacklist.guard";

@ApiTags('Orders')
@Controller('orders')
@ApiBearerAuth()
export class UserOrderController {
    constructor(
        private readonly orderService: UserOrderService) {
    }

    @UseGuards(JwtAuthGuard,BlacklistGuard)
    @Get('/me')
    @ApiOperation({summary: 'دریافت لیست تمام سفارشات کاربر'})
    async getUserOrders(
        @CurrentUser() user: User,
        @Query() query: any
    ) {
        // دریافت مقدار با کلید دقیق 'orderType[]'
        let orderType = query['orderType[]'];

        // اطمینان از اینکه آرایه است
        if (typeof orderType === 'string') {
            orderType = [orderType];
        }

        const userId = user.id;
        return this.orderService.getUserOrders(userId, orderType);
    }

    @UseGuards(JwtAuthGuard,BlacklistGuard)
    @Get(':id/me')
    @ApiOperation({summary: 'دریافت جزئیات یک سفارش خاص'})
    async getOrderById(@Param('id') id: string, @Request() req) {
        const userId = req.user.id;
        return this.orderService.getOrderById(id, userId);
    }

    @UseGuards(JwtAuthGuard,BlacklistGuard)
    @Patch(':id/cancel-order-by-user')
    @ApiOperation({summary: 'لفو یک سفارش خاص'})
    async cancelOrderByUser(@Param('id') id: string, @Request() req) {
        const userId = req.user.id;
        return this.orderService.cancelOrderByUser(id, userId);
    }

    @Get('products/best-selling')
    @ApiOperation({summary: 'دریافت لیست پرفروش‌ترین محصولات'})
    async getBestSellingProducts(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
    ) {
        // می‌توانید تعداد را از کوئری بگیرید، مثلا: ?limit=20
        return this.orderService.getBestSellingProducts(limit);
    }
}