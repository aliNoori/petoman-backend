import {Controller, Get, Post, Body, UseGuards, Request, Param, Delete} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { DiscountService } from "./discount.service";
import { CreateDiscountDto, ApplyDiscountDto } from "./discount.dto";
import {JwtAuthGuard} from "../auth/guards/jwt-auth.guard";
import {CurrentUser} from "../auth/guards/current-user.decorator";
import {User} from "../user/entities/user.entity";
import {EntityManager} from "typeorm";
import {InjectEntityManager} from "@nestjs/typeorm";
import {BlacklistGuard} from "../auth/guards/blacklist.guard";

@ApiTags('Discounts')
@Controller('discounts')
export class DiscountController {
    constructor(private discountService: DiscountService,
    @InjectEntityManager() private entityManager: EntityManager
    ) {}

    @Post()
    @UseGuards(JwtAuthGuard,BlacklistGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'ایجاد کد تخفیف' })
    create(@Body() dto: CreateDiscountDto, @CurrentUser() user: User) {
        return this.discountService.create(dto, user.id);
    }

    @Post('/claim')
    @UseGuards(JwtAuthGuard,BlacklistGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'ثبت کد تخیف توسط کاربر' })
    claimDiscountCode(@Body('code') discountCode: string, @CurrentUser() user: User) {
        return this.discountService.claimDiscountCode(discountCode, user.id);
    }

    @Get('my')
    @UseGuards(JwtAuthGuard,BlacklistGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'دریافت لیست کدهای من' })
    getMyDiscounts(@CurrentUser() user: User) {
        return this.discountService.getUserDiscounts(user.id);
    }

    @Post('apply')
    @UseGuards(JwtAuthGuard,BlacklistGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'اعمال کد تخفیف روی سبد خرید' })
    apply(@Body() dto: ApplyDiscountDto, @CurrentUser() user: User) {
        // فرض بر این است که cartTotal را از بدنه درخواست دریافت می‌کنیم
        // یا می‌توانید منطق محاسبه سبد خرید را در سرویس داشته باشید
        const { cartTotal } = dto;
        const canApply=dto.canApply

        return this.discountService.validateAndApplyDiscount(this.entityManager,dto.code, user.id, cartTotal,canApply);
    }

    @Delete('revoke/:id')
    @UseGuards(JwtAuthGuard,BlacklistGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'لغو یا پشیمانی از کد تخفیف (حذف از سبد خرید)' })
    async revokeDiscount(
        @CurrentUser() user: User,
        @Param('id') discountId: string
    ) {

        return this.discountService.revokeDiscount(this.entityManager, discountId, user.id);
    }
}