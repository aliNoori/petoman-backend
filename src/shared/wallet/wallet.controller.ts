import {ApiBearerAuth, ApiOperation, ApiTags, ApiBody, ApiQuery} from "@nestjs/swagger";
import {Controller, Post, Get, Body, Req, UseGuards, Query, Patch} from "@nestjs/common";
import {WalletService} from "./wallet.service";
import {JwtAuthGuard} from "../auth/guards/jwt-auth.guard";
import {WalletType} from "./wallet.entity";
import {CurrentUser} from "../auth/guards/current-user.decorator";
import {User} from "../user/entities/user.entity";
import {TenantMembershipGuard} from "../auth/guards/tenant-membership.guard";
import {CapabilityGuard} from "../auth/guards/capability.guard";
import {TenantGuard} from "../auth/guards/tenant.guard";
import {Permissions} from "../auth/decorators/permissions.decorator";

@ApiTags('Wallet')
@ApiBearerAuth()
@UseGuards(
    JwtAuthGuard,
)
@Controller('wallet')
export class WalletController {
    constructor(private walletService: WalletService) {}

    @Get('me')
    @ApiOperation({ summary: 'Get my wallet balance and details' })
    @ApiQuery({ name: 'type', required: false, enum: WalletType })
    async getOrCreateWalletUser(@CurrentUser() user:User, @Query('type') type?: WalletType) {
        const userId = user.id;
        const walletType = type || WalletType.USER;

        return this.walletService.getOrCreateWalletUser(userId, walletType);
    }

    @Get('tenant')
    @UseGuards(
        TenantMembershipGuard,
        TenantGuard,
        CapabilityGuard,
    )
    @Permissions('wallets.view')
    @ApiOperation({ summary: 'Get my wallet balance and details' })
    @ApiQuery({ name: 'type', required: false, enum: WalletType })
    async getOrCreateWalletTenant(@CurrentUser() user:User, @Query('type') type: WalletType) {
        const userId = user.id;
        const walletType = type || WalletType.SHOP;
        return this.walletService.getOrCreateWalletTenant(userId, walletType);
    }

    @Get('platform')
    @ApiOperation({ summary: 'Get platform wallet balance and details' })
    @ApiQuery({ name: 'type', required: false, enum: WalletType })
    async getOrCreateWalletPlatform(@CurrentUser() user:User, @Query('type') type?: WalletType) {
        const adminId = user.id;
        const walletType = type || WalletType.PETOMAN;

        return this.walletService.getOrCreateWalletPlatform(adminId, walletType);
    }

    @Get()
    @ApiOperation({ summary: 'Get my wallet balance and details' })
    @ApiQuery({ name: 'type', required: false, enum: WalletType })
    async getWallet(@Req() req, @Query('type') type?: WalletType) {
        const userId = req.user?.id;
        const tenantId = req.user?.tenantId;
        const walletType = type || WalletType.USER;

        return this.walletService.getWallet(tenantId, userId, walletType);
    }

    @Get('transactions/tenant')
    @UseGuards(
        TenantMembershipGuard,
        TenantGuard,
        CapabilityGuard,
    )
    @ApiOperation({ summary: 'Get wallet transaction history' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'type', required: false, enum: ['CREDIT', 'DEBIT'] })
    async getTenantTransactions(
        @Req() req,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Query('type') type?: 'CREDIT' | 'DEBIT'
    ) {
        const userId = req.user?.id;
        const walletType = WalletType.SHOP;
        const tenantId = req.user?.tenantId;

        return this.walletService.getTransactions(tenantId, userId, walletType, { page, limit, type });
    }

    @Get('transactions/platform-fee/tenant')
    @UseGuards(
        TenantMembershipGuard,
        TenantGuard,
        CapabilityGuard,
    )
    @ApiOperation({ summary: 'Get wallet transaction history' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'type', required: false, enum: ['CREDIT', 'DEBIT'] })
    async getPlatformFeeForTenantTransactions(
        @Req() req,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Query('type') type?: 'FEE_INCOME'
    ) {
        const userId = req.user?.id;
        const walletType = WalletType.PETOMAN;
        const tenantId = req.user?.tenantId;

        return this.walletService.getPlatformFeeTransactions(tenantId, userId, walletType, { page, limit, type });
    }
    @Get('transactions')
    @ApiOperation({ summary: 'Get wallet transaction history' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'type', required: false, enum: ['CREDIT', 'DEBIT'] })
    async getTransactions(
        @Req() req,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Query('walletType')  walletType:WalletType,
        @Query('type') type?: 'CREDIT' | 'DEBIT'
    ) {
        const userId = req.user?.id;
        const tenantId = req.user?.tenantId;

        return this.walletService.getTransactions(tenantId, userId, walletType, { page, limit, type });
    }

    @Post('credit')
    @ApiOperation({ summary: 'Credit wallet (Add funds)' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                amount: { type: 'number', example: 100000 },
                description: { type: 'string', example: 'شارژ کیف پول' },
                type: { type: 'string', enum: WalletType, example: WalletType.USER }
            }
        }
    } as any)
    async creditWallet(@Req() req, @Body() body: { amount: number, description: string, type?: WalletType }) {
        const userId = req.user?.id;
        const tenantId = req.user?.tenantId;
        const walletType = body.type || WalletType.USER;

        return this.walletService.credit(tenantId, userId, walletType, body.amount, body.description);
    }

    @Post('debit')
    @ApiOperation({ summary: 'Debit wallet (Deduct funds)' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                amount: { type: 'number', example: 50000 },
                description: { type: 'string', example: 'کسر وجه' },
                type: { type: 'string', enum: WalletType, example: WalletType.SHOP }
            }
        }
    } as any)
    async debitWallet(@Req() req, @Body() body: { amount: number, description: string, type?: WalletType }) {
        const userId = req.user?.id;
        const tenantId = req.user?.tenantId;
        const walletType = body.type || WalletType.USER;

        return this.walletService.debit(tenantId, userId, walletType, body.amount, body.description);
    }

    @Post('transfer')
    @ApiOperation({ summary: 'Transfer funds between wallets' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                fromType: { type: 'string', enum: WalletType, example: WalletType.SHOP },
                toType: { type: 'string', enum: WalletType, example: WalletType.PETOMAN },
                toUserId: { type: 'string', description: 'Target user ID' },
                amount: { type: 'number', example: 10000 },
                description: { type: 'string', example: 'Commission' }
            }
        }
    } as any)
    async transfer(@Req() req, @Body() body: {
        fromType: WalletType,
        toType: WalletType,
        toUserId?: string, // Made optional
        amount: number,
        description: string
    }) {
        const userId = req.user?.id;
        const tenantId = req.user?.tenantId;

        return this.walletService.transfer(
            tenantId,
            userId,
            body.fromType,
            body.toType,
            body.toUserId, // Can be undefined
            body.amount,
            body.description
        );
    }

    @Patch('freeze')
    @ApiOperation({ summary: 'Freeze wallet' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                type: { type: 'string', enum: WalletType, example: WalletType.USER },
                reason: { type: 'string', example: 'Security check' }
            }
        }
    }as any)
    async freezeWallet(@Req() req, @Body() body: { type?: WalletType, reason: string }) {
        const userId = req.user?.id;
        const tenantId = req.user?.tenantId;
        const walletType = body.type || WalletType.USER;

        return this.walletService.updateStatus(tenantId, userId, walletType, 'FROZEN', body.reason);
    }

    @Patch('unfreeze')
    @ApiOperation({ summary: 'Unfreeze wallet' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                type: { type: 'string', enum: WalletType, example: WalletType.USER }
            }
        }
    } as any)
    async unfreezeWallet(@Req() req, @Body() body: { type?: WalletType }) {
        const userId = req.user?.id;
        const tenantId = req.user?.tenantId;
        const walletType = body.type || WalletType.USER;

        return this.walletService.updateStatus(tenantId, userId, walletType, 'ACTIVE', 'Wallet reactivated');
    }
}