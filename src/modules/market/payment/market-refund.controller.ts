import {ApiBearerAuth, ApiOperation, ApiParam, ApiTags} from "@nestjs/swagger";
import {Controller, Param, Post, UseGuards} from "@nestjs/common";
import {MarketRefundService} from "./market-refund.service";
import {CurrentUser} from "../../../shared/auth/guards/current-user.decorator";
import {User} from "../../../shared/user/entities/user.entity";
import {JwtAuthGuard} from "../../../shared/auth/guards/jwt-auth.guard";
import {CapabilityGuard} from "../../../shared/auth/guards/capability.guard";
import {TenantMembershipGuard} from "../../../shared/auth/guards/tenant-membership.guard";
import {TenantGuard} from "../../../shared/auth/guards/tenant.guard";
import {Capabilities} from "../../../shared/auth/decorators/capabilities.decorator";

@ApiTags('Market Orders')
@ApiBearerAuth()
@UseGuards(
    JwtAuthGuard,
    TenantMembershipGuard,
    CapabilityGuard,
    TenantGuard,
)
@Capabilities('ORDER_MANAGEMENT')

@Controller('market/orders')
export class MarketRefundController {
    constructor(private refundService: MarketRefundService) {}

    /**
     * Cancel paid order and refund wallet
     */
    @Post(':orderId/refund')
    @ApiOperation({
        summary: 'Cancel paid order and refund wallet balance',
    })
    @ApiParam({
        name: 'orderId',
        description: 'Paid order ID',
    })
    refund(@Param('orderId') orderId: string,@CurrentUser() user:User) {
        //return this.refundService.refundOrder(orderId,user.id);
    }
}