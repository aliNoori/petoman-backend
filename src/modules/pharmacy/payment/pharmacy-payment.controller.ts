import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    HttpCode,
    HttpStatus,
    BadRequestException,
    InternalServerErrorException,
    UnauthorizedException,
    NotFoundException,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiBody,
    ApiTags,
    ApiUnauthorizedResponse,
    ApiBadRequestResponse,
    ApiNotFoundResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../shared/auth/guards/current-user.decorator';
import { User } from '../../../shared/user/entities/user.entity';
import { SubmitOrderDto } from '../../../shared/order/submit-order.dto';
import { PharmacyPaymentService } from './pharmacy-payment.service';
import { I18nService } from 'nestjs-i18n';
import {PharmacyOrderDto} from "./dto/pharmacy-order.dto";

@ApiTags('Pharmacy / Payment & Orders')
@ApiBearerAuth()
@Controller('payments/pharmacy')
export class PharmacyPaymentController {
    constructor(
        private readonly paymentService: PharmacyPaymentService,
        private readonly i18n: I18nService
    ) {}

    /**
     * Submit Order and Initiate Payment
     */
    @Post('submit')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Submit order and create payment based on method (wallet/online)',
        description: 'ثبت سفارش و ایجاد درگاه پرداخت یا کسر از کیف پول.'
    })
    @ApiBody({type: PharmacyOrderDto})
    @ApiCreatedResponse({
        description: 'Order submitted and payment initiated successfully.',
        schema: {
            example: {
                statusCode: 201,
                message: 'پرداخت با موفقیت ایجاد شد.',
                data: {
                    orderId: '550e8400-e29b-41d4-a716-446655440000',
                    paymentId: '550e8400-e29b-41d4-a716-446655440002',
                    requiresAction: true,
                    actionType: 'ONLINE_PAYMENT',
                    redirectUrl: 'https://gateway.example.com/pay?id=...',
                    amount: 300000
                }
            }
        }
    })
    @ApiUnauthorizedResponse({ description: 'احراز هویت لازم است.' })
    @ApiBadRequestResponse({ description: 'خطا در داده‌های ورودی یا موجودی ناکافی.' })
    async submitOrderAndPay(
        @Body() orderData: PharmacyOrderDto,
        @CurrentUser() user: User
    ) {
        if (!user || !user.id) {
            throw new UnauthorizedException(this.i18n.translate('error.unauthorized'));
        }
        try {
            const result = await this.paymentService.submitOrderAndPay(orderData, user.id);
            return {
                statusCode: HttpStatus.CREATED,
                message: this.i18n.translate('payment.create_success'),
                data: result
            };
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw new BadRequestException(error.message || this.i18n.translate('payment.create_error'));
            }
            if (error instanceof UnauthorizedException) {
                throw new UnauthorizedException(error.message || this.i18n.translate('error.unauthorized'));
            }
            throw new InternalServerErrorException(error.message || this.i18n.translate('payment.create_error'));
        }
    }

    /**
     * Pay the remaining balance of an order using Wallet
     */
    @Post('pay-wallet-remaining')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Pay the remaining balance of an order',
        description: 'پرداخت مابقی مبلغ سفارش از طریق کیف پول.'
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                orderId: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
                amount: { type: 'number', example: 150000 },
                tenantId: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440001' },
                paymentMethod: { type: 'string', enum: ['wallet'], default: 'wallet' }
            },
            required: ['orderId', 'amount', 'tenantId']
        }
    })
    @ApiOkResponse({
        description: 'Remaining amount paid successfully via wallet.',
        schema: {
            example: {
                statusCode: 200,
                message: 'وضعیت پرداخت با موفقیت تغییر کرد.',
                data: {
                    orderId: '550e8400-e29b-41d4-a716-446655440000',
                    remainingAmount: 0,
                    walletBalance: 1000000
                }
            }
        }
    })
    @ApiUnauthorizedResponse({ description: 'احراز هویت لازم است.' })
    @ApiBadRequestResponse({ description: 'داده‌های ورودی نامعتبر یا موجودی ناکافی.' })
    async payRemainingAmount(
        @CurrentUser() user: User,
        @Body('orderId') orderId: string,
        @Body('amount') amount: number,
        @Body('tenantId') tenantId: string,
        @Body('paymentMethod') paymentMethod: 'wallet' = 'wallet',
    ) {
        if (!user || !user.id) {
            throw new UnauthorizedException(this.i18n.translate('error.unauthorized'));
        }
        try {
            if (paymentMethod === 'wallet') {
                const result = await this.paymentService.payRemainingAmountWithWallet(orderId, amount, tenantId, user.id);
                return {
                    statusCode: HttpStatus.OK,
                    message: this.i18n.translate('payment.status_update_success'),
                    data: result
                };
            }
            throw new BadRequestException(this.i18n.translate('payment.create_error'));
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw new BadRequestException(error.message || this.i18n.translate('payment.create_error'));
            }
            throw new InternalServerErrorException(error.message || this.i18n.translate('payment.create_error'));
        }
    }

    /**
     * Verify payment status
     */
    @Get(':paymentId/status')
    @ApiOperation({
        summary: 'Get payment status',
        description: 'بررسی وضعیت پرداخت توسط شناسه پرداخت.'
    })
    @ApiParam({
        name: 'paymentId',
        type: 'string',
        description: 'شناسه منحصر به فرد پرداخت'
    })
    @ApiOkResponse({
        description: 'Payment status retrieved successfully.',
        schema: {
            example: {
                statusCode: 200,
                message: 'جزئیات پرداخت با موفقیت دریافت شد.',
                data: {
                    paymentId: '550e8400-e29b-41d4-a716-446655440002',
                    status: 'PENDING',
                    amount: 150000,
                    createdAt: '2023-10-27T10:00:00Z'
                }
            }
        }
    })
    @ApiUnauthorizedResponse({ description: 'احراز هویت لازم است.' })
    @ApiNotFoundResponse({ description: 'پرداخت مورد نظر یافت نشد.' })
    async getStatus(
        @Param('paymentId') paymentId: string,
        @CurrentUser() user: User
    ) {
        if (!user || !user.id) {
            throw new UnauthorizedException(this.i18n.translate('error.unauthorized'));
        }
        try {
            const data = await this.paymentService.getPaymentStatus(paymentId, user.id);
            return {
                statusCode: HttpStatus.OK,
                message: this.i18n.translate('payment.detail_success'),
                data: data
            };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw new NotFoundException(error.message || this.i18n.translate('payment.not_found'));
            }
            throw new InternalServerErrorException(error.message || this.i18n.translate('payment.update_error'));
        }
    }

    /**
     * Cancel a pending payment
     */
    @Post(':paymentId/cancel')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Cancel a pending payment',
        description: 'لغو یک پرداخت در انتظار.'
    })
    @ApiParam({
        name: 'paymentId',
        type: 'string',
        description: 'شناسه پرداخت برای لغو'
    })
    @ApiOkResponse({
        description: 'Payment cancelled successfully.',
        schema: {
            example: {
                statusCode: 200,
                message: 'وضعیت پرداخت با موفقیت تغییر کرد.',
                data: {
                    paymentId: '550e8400-e29b-41d4-a716-446655440002',
                    status: 'CANCELLED',
                    refundAmount: 150000
                }
            }
        }
    })
    @ApiUnauthorizedResponse({ description: 'احراز هویت لازم است.' })
    @ApiNotFoundResponse({ description: 'پرداخت مورد نظر یافت نشد.' })
    async cancelPayment(
        @Param('paymentId') paymentId: string,
        @CurrentUser() user: User
    ) {
        if (!user || !user.id) {
            throw new UnauthorizedException(this.i18n.translate('error.unauthorized'));
        }
        try {
            const data = await this.paymentService.cancelPayment(paymentId, user.id);
            return {
                statusCode: HttpStatus.OK,
                message: this.i18n.translate('payment.status_update_success'),
                data: data
            };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw new NotFoundException(error.message || this.i18n.translate('payment.not_found'));
            }
            throw new InternalServerErrorException(error.message || this.i18n.translate('payment.status_update_error'));
        }
    }

    /**
     * [Admin/Shop Only] Manually confirm a payment
     */
    @Post(':paymentId/confirm')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Manually confirm a payment',
        description: 'تایید دستی پرداخت (مناسب برای کارت به کارت یا حضوری).'
    })
    @ApiParam({
        name: 'paymentId',
        type: 'string',
        description: 'شناسه پرداخت برای تایید'
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                referenceId: { type: 'string', description: 'شماره پیگیری بانکی یا مرجع پرداخت' }
            }
        },
        description: 'Data required to manually confirm the payment.'
    })
    @ApiOkResponse({
        description: 'Payment confirmed successfully.',
        schema: {
            example: {
                statusCode: 200,
                message: 'وضعیت پرداخت با موفقیت تغییر کرد.',
                data: {
                    paymentId: '550e8400-e29b-41d4-a716-446655440002',
                    status: 'PAID',
                    referenceId: 'REF123456'
                }
            }
        }
    })
    @ApiUnauthorizedResponse({ description: 'دسترسی لازم نیست.' })
    @ApiNotFoundResponse({ description: 'پرداخت مورد نظر یافت نشد.' })
    @ApiBadRequestResponse({ description: 'داده‌های ورودی نامعتبر.' })
    async confirmPayment(
        @Param('paymentId') paymentId: string,
        @Body() body: { referenceId?: string },
        @CurrentUser() user: User
    ) {
        if (!user || !user.id) {
            throw new UnauthorizedException(this.i18n.translate('error.unauthorized'));
        }
        try {
            const data = await this.paymentService.manualConfirmPayment(paymentId, user.id, body.referenceId);
            return {
                statusCode: HttpStatus.OK,
                message: this.i18n.translate('payment.status_update_success'),
                data: data
            };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw new NotFoundException(error.message || this.i18n.translate('payment.not_found'));
            }
            if (error instanceof BadRequestException) {
                throw new BadRequestException(error.message || this.i18n.translate('payment.update_error'));
            }
            throw new InternalServerErrorException(error.message || this.i18n.translate('payment.update_error'));
        }
    }
}