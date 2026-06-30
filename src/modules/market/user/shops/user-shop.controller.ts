import {Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req} from '@nestjs/common';
import {ApiTags, ApiOperation, ApiBearerAuth, ApiResponse} from '@nestjs/swagger';
import { CreateRequestShopDto } from "./dto/create-request-shop.dto";
import { CurrentUser } from "../../../../shared/auth/guards/current-user.decorator";
import { User } from "../../../../shared/user/entities/user.entity";
import {UpdateRequestShopDto} from "./dto/update-request-shop.dto";
import {UserShopService} from "./user-shop.service";
import {CreateReviewDto} from "../../review/create-review.dto";
import {Request} from "express";

@ApiTags('Market / Shops')
@ApiBearerAuth()
@Controller('user/shops')
export class UserShopController {
    constructor(
        private readonly shopService: UserShopService,
    ) {}

    @Get(':shopId/settings')
    @ApiOperation({summary: 'Get all market settings'})
    @ApiResponse({status: 200, description: 'Returns all settings as an object.'})
    getAll(@Param('shopId') shopId:string) {
        return this.shopService.getAllSettings(shopId);
    }

    @Get()
    async findAll() {
        return this.shopService.findAll();
    }

    @Post('requests')
    @ApiOperation({ summary: 'Request for create pet-shop' })
    createRequestForShop(@Body() dto: CreateRequestShopDto,
                         @CurrentUser() user: User,
                         @Req() req: Request) {
        const deviceInfo = this.extractDeviceInfo(req);
        return this.shopService.addRequestForShop(dto, user,deviceInfo);
    }

    @Patch('requests/:id')
    @ApiOperation({ summary: 'Request for update pet-shop' })
    updateRequestForShop(@Param('id') id: string,
                         @Body() dto: UpdateRequestShopDto,
                         @CurrentUser() user: User) {
        return this.shopService.updateRequestForShop(id,dto, user.id);
    }

    @Get('requests/me')
    @ApiOperation({ summary: 'Get all pet-shop requests for user' })
    findAllRequestsMe(@CurrentUser() user:User) {
        return this.shopService.findAllForMe(user.id);
    }

    /**
     * Submit review for a purchased shop
     */
    @Post(':tenantId/reviews')
    @ApiOperation({
        summary: 'Submit review for shop',
    })
    create(
        @Param('tenantId') tenantId: string,
        @Body() dto: CreateReviewDto,
        @CurrentUser() user:User
    ) {
        return this.shopService.createReview(tenantId,user.id, dto);
    }

    private extractDeviceInfo(req: Request): { ip: string; userAgent: string } {
        // نکته مهم: برای دریافت IP واقعی، باید در main.ts app.enableTrustProxy() را صدا زده باشید
        // اگر پشت NGINX/Cloudflare هستید، req.ip یا req.ips کار می‌کند.
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';

        return {ip, userAgent};
    }
}