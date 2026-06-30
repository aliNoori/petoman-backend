import {Body,Controller,Get,Param,Post,Query,UseGuards,Patch,HttpCode,
    HttpStatus,DefaultValuePipe, ParseEnumPipe, ParseIntPipe} from '@nestjs/common';
import {ApiBearerAuth, ApiOkResponse,ApiOperation, ApiParam,ApiTags} from '@nestjs/swagger';
import { JwtAuthGuard } from "../../../shared/auth/guards/jwt-auth.guard";
import { TenantMembershipGuard } from "../../../shared/auth/guards/tenant-membership.guard";
import { CapabilityGuard } from "../../../shared/auth/guards/capability.guard";
import { CurrentUser } from "../../../shared/auth/guards/current-user.decorator";
import { User } from "../../../shared/user/entities/user.entity";
import { SubmitOrderDto } from "../../../shared/order/submit-order.dto";
import { OrderResponseDto } from "../../../shared/order/order-response.dto";
import { ListOrdersQuery } from "../../../shared/order/list-orders.query";
import { OrderStatus } from "../../../shared/order/order-status.enum";
import {TenantGuard} from "../../../shared/auth/guards/tenant.guard";
import {Capabilities} from "../../../shared/auth/decorators/capabilities.decorator";
import {PharmacyOrderService} from "./pharmacy-order.service";
import {TrackingService} from "./tracing-order.service";

@ApiTags('Pharmacy / Orders')
@ApiBearerAuth()
@Controller('pharmacy/orders')
@UseGuards(
    JwtAuthGuard,
    TenantMembershipGuard,
    CapabilityGuard,
    TenantGuard,
)
@Capabilities('ORDER_MANAGEMENT')
export class PharmacyOrderController {
    constructor(
        private readonly pharmacyOrderService: PharmacyOrderService,
        private trackingService: TrackingService
    ) {}

    // ================= SHOP / ADMIN ACTIONS =================

    @Get('list')
    @ApiOperation({ summary: '[Shop] Get list of all orders for this shop' })
    @ApiOkResponse({ type: [OrderResponseDto] })
    async listShopOrders(
        @Query('status', new DefaultValuePipe(undefined), new ParseEnumPipe(OrderStatus, { optional: true })) status?: OrderStatus,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
    ) {
        const query: ListOrdersQuery = {
            status,
            page,
            limit
        };

        return this.pharmacyOrderService.listShopOrders(query);
    }

    @Patch(':id/confirm')
    @ApiOperation({ summary: '[Shop] Confirm a pending order' })
    @ApiParam({ name: 'id', description: 'Order ID' })
    async confirmOrder(@Param('id') orderId: string) {
        return this.pharmacyOrderService.confirmOrder(orderId);
    }

    @Patch(':id/reject')
    @ApiOperation({ summary: '[Shop] Reject a pending order' })
    @ApiParam({ name: 'id', description: 'Order ID' })
    async rejectOrder(
        @Param('id') orderId: string,
        @Body('reason') reason?: string
    ) {
        return this.pharmacyOrderService.rejectOrder(orderId, reason);
    }

    @Patch(':id/status')
    @ApiOperation({ summary: '[Shop] Update order status (e.g., Shipped, Delivered)' })
    @ApiParam({ name: 'id', description: 'Order ID' })
    async updateOrderStatus(
        @Param('id') orderId: string,
        @Body('status') status: OrderStatus
    ) {
        return this.pharmacyOrderService.updateOrderStatus(orderId, status);
    }

    @Patch(':id/metadata')
    @ApiOperation({ summary: '[Shop] Update Metadata order (e.g., Shipped, Delivered)' })
    @ApiParam({ name: 'id', description: 'Order ID' })
    async updateMetadataOrder(
        @Param('id') orderId: string,
        @Body('metadata') metadata: any
    ) {
        return this.pharmacyOrderService.updateMetadataOrder(orderId, metadata);
    }
    @Post(':id/tracking')
    async updateTracking(
        @Param('id') id: string,
        @Body() body: { trackingCode: string, provider?: string }
    ) {
        return await this.trackingService.saveManualTrackingCode(
            id,
            body.trackingCode,
            body.provider || 'manual'
        );
    }

    // ================= USER ACTIONS =================

    @Post('submit')
    @ApiOperation({ summary: 'Submit cart and create a pending order' })
    @ApiOkResponse({ type: OrderResponseDto })
    async submitOrder(
        @CurrentUser() user: User,
        @Body() dto: SubmitOrderDto
    ) {
        return this.pharmacyOrderService.submitOrder(dto, user.id);
    }

    @Get('my')
    @ApiOperation({ summary: 'Get list of current user orders' })
    @ApiOkResponse({ type: [OrderResponseDto] })
    async listMyOrders(
        @CurrentUser() user: User,
        @Query() query: ListOrdersQuery
    ) {
        return this.pharmacyOrderService.listOrders(query, user.id);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get details of a specific order' })
    @ApiParam({ name: 'id', description: 'Order ID' })
    @ApiOkResponse({ type: OrderResponseDto })
    async getOrderById(
        @CurrentUser() user: User,
        @Param('id') orderId: string
    ) {
        return this.pharmacyOrderService.getOrderById(orderId, user.id);
    }

    @Post(':id/cancel')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Cancel a pending order' })
    @ApiParam({ name: 'id', description: 'Order ID' })
    async cancelOrder(
        @CurrentUser() user: User,
        @Param('id') orderId: string
    ) {
        return this.pharmacyOrderService.cancelOrder(orderId, user.id);
    }

}