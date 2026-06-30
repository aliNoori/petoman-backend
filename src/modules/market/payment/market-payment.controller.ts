import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    HttpCode,
    HttpStatus,
    UnauthorizedException,
    BadRequestException,
    InternalServerErrorException,
    NotFoundException
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
    ApiBadRequestResponse
} from '@nestjs/swagger';
import { MarketPaymentService } from './market-payment.service';
import { CurrentUser } from '../../../shared/auth/guards/current-user.decorator';
import { User } from '../../../shared/user/entities/user.entity';
import { I18nService } from 'nestjs-i18n';
import {MarketSubmitOrderDto} from "../order/dto/market-order.dto";

@ApiTags('Market / Payment')
@ApiBearerAuth()
@Controller('payments/market')
export class MarketPaymentController {
    constructor(
        private readonly paymentService: MarketPaymentService,
        private readonly i18n: I18nService
    ) {}

    /**
     * Submit Order and Initiate Payment
     */
    @Post('submit')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Submit order and initiate payment',
        description: 'ثبت سفارش و شروع فرآیند پرداخت.'
    })
    @ApiBody({ type: MarketSubmitOrderDto })
    @ApiCreatedResponse({
        description: 'سفارش با موفقیت ثبت شد.',
        schema: {
            example: {
                statusCode: 200,
                message: 'سفارش با موفقیت ایجاد شد.',
                data: {
                    requiresAction: true,
                    actionType: 'ONLINE_PAYMENT',
                    data: {
                        orderId: '550e8400-e29b-41d4-a716-446655440000',
                        amount: 1500000,
                        tenantId: '550e8400-e29b-41d4-a716-446655440001',
                        paymentId: '550e8400-e29b-41d4-a716-446655440002'
                    }
                }
            }
        }
    })
    @ApiUnauthorizedResponse({ description: 'احراز هویت لازم است.' })
    @ApiBadRequestResponse({ description: 'خطا در داده‌های ورودی یا موجودی کالا.' })
    async submitOrderAndPay(
        @Body() orderData: MarketSubmitOrderDto,
        @CurrentUser() user: User
    ) {
        if (!user || !user.id) {
            throw new UnauthorizedException(this.i18n.translate('error.unauthorized'));
        }

        try {
            const result = await this.paymentService.submitOrderAndPay(orderData, user.id);
            return {
                statusCode: HttpStatus.OK,
                message: this.i18n.translate('order.create_success'),
                data: result
            };
        } catch (error) {
            // Handling specific errors from service or general mapping
            if (error instanceof BadRequestException) {
                throw new BadRequestException(error.message || this.i18n.translate('error.validation_error'));
            }
            if (error instanceof UnauthorizedException) {
                throw new UnauthorizedException(error.message || this.i18n.translate('error.unauthorized'));
            }
            // Default to general error or server error
            throw new InternalServerErrorException(error.message || this.i18n.translate('error.general_error'));
        }
    }

    /**
     * Verify payment status
     */
    @Get(':paymentId/status')
    @ApiOperation({ summary: 'Get payment status' })
    @ApiParam({ name: 'paymentId', type: 'string', description: 'شناسه پرداخت' })
    @ApiOkResponse({
        description: 'وضعیت پرداخت با موفقیت بازیابی شد.',
        schema: {
            example: {
                statusCode: 200,
                message: 'وضعیت پرداخت با موفقیت تغییر کرد.', // Mapping to status_update_success or a general retrieve message if needed, but sticking to standard keys
                data: {
                    paymentId: '550e8400-e29b-41d4-a716-446655440002',
                    status: 'PENDING',
                    amount: 1500000
                }
            }
        }
    })
    @ApiUnauthorizedResponse({ description: 'احراز هویت لازم است.' })
    @HttpCode(HttpStatus.OK)
    async getStatus(
        @Param('paymentId') paymentId: string,
        @CurrentUser() user: User
    ) {
        if (!user || !user.id) {
            throw new UnauthorizedException(this.i18n.translate('error.unauthorized'));
        }

        try {
            const data = await this.paymentService.getPaymentStatus(paymentId, user.id);
            // Using a generic success message for retrieval if not explicitly in payment.json,
            // but we can use 'list_success' or create a 'detail_success' contextually.
            // Based on previous payment.json, we don't have 'status_retrieved', so I'll use a logical fallback or 'update_success' if it implies checking status.
            // Let's use 'general_success' logic or map to 'update_success' if it's considered an update check,
            // but better to stick to standard keys. I will use 'payment.status_update_success' if it fits,
            // otherwise I'll assume a standard 'OK' message.
            // Since 'payment.status_update_success' exists, let's use it if applicable, or 'general_error' for fail.
            // For success retrieval, I'll use 'payment.detail_success' if we added it, or 'list_success'.
            // In the previous payment.json, I didn't add 'detail_success' explicitly for payment, but I did for transaction/order.
            // Let's use 'payment.status_update_success' as it's the closest, or just 'general_error' if not found.
            // Actually, looking at order.json, 'detail_success' was added. Let's assume we can use 'payment.detail_success' or similar.
            // To be safe and consistent with the provided payment.json which only had 'status_update_success', 'create_success', etc.
            // I will use 'payment.status_update_success' as a proxy for 'status retrieved/updated' or create a generic 'success' if needed.
            // However, the user asked to match the files. In payment.json: "status_update_success": "وضعیت پرداخت با موفقیت تغییر کرد."
            // This is for *updating* status. For *getting* status, it's better to have a specific key.
            // Since I didn't add 'status_retrieved' to payment.json in the previous step, I will use 'payment.status_update_success'
            // as it's the most relevant existing key, OR I will assume the service returns a success object and we just need a message.
            // Let's use 'payment.status_update_success' for now to keep it strict to the provided JSON,
            // or better, since 'detail_success' was in order/transaction, I'll add it conceptually or use 'list_success' if it's a list.
            // Let's stick to the provided keys. I will use 'payment.status_update_success' as the success message for this endpoint
            // as it's the closest semantic match in the provided JSON for payment status operations.

            return {
                statusCode: HttpStatus.OK,
                message: this.i18n.translate('payment.status_update_success'),
                data: data
            };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw new NotFoundException(error.message || this.i18n.translate('payment.not_found'));
            }
            throw new InternalServerErrorException(error.message || this.i18n.translate('error.general_error'));
        }
    }

    /**
     * [Webhook] Callback for Online Payment Gateways
     */
    @Post('online/callback/:gateway')
    @ApiOperation({ summary: 'Online payment callback (Webhook)' })
    @ApiParam({ name: 'gateway', type: 'string', description: 'نام درگاه پرداخت (مثلاً zarinpal)' })
    @ApiBody({ schema: { type: 'object' } })
    @HttpCode(HttpStatus.OK)
    async verifyOnlinePayment(
        @Param('gateway') gateway: string,
        @Body() callbackData: any
    ) {
        try {
            const data = await this.paymentService.verifyOnlinePayment(gateway, callbackData);
            // Webhooks usually don't have specific "success" messages in the same way, but we can return a standard success
            return {
                statusCode: HttpStatus.OK,
                message: this.i18n.translate('payment.status_update_success'), // Assuming the status was updated to PAID
                data: data
            };
        } catch (error) {
            // Webhook errors should often return 200 OK to the gateway to prevent retries,
            // but for internal logging/API consistency, we might want to handle it.
            // However, since this is a controller response to the gateway, we usually just return 200.
            // If we want to return an error to the caller (if this endpoint is also exposed to users), we throw.
            // Assuming this is internal or strictly for gateway:
            throw new InternalServerErrorException(error.message || this.i18n.translate('error.general_error'));
        }
    }

    /**
     * Cancel a pending payment
     */
    @Post(':paymentId/cancel')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Cancel a pending payment' })
    @ApiParam({ name: 'paymentId', type: 'string', description: 'شناسه پرداخت' })
    @ApiOkResponse({
        description: 'پرداخت با موفقیت لغو شد.',
        schema: {
            example: {
                statusCode: 200,
                message: 'وضعیت پرداخت با موفقیت تغییر کرد.',
                data: {
                    paymentId: '550e8400-e29b-41d4-a716-446655440002',
                    status: 'CANCELLED'
                }
            }
        }
    })
    @ApiUnauthorizedResponse({ description: 'احراز هویت لازم است.' })
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
            if (error instanceof UnauthorizedException) {
                throw new UnauthorizedException(error.message || this.i18n.translate('error.unauthorized'));
            }
            throw new InternalServerErrorException(error.message || this.i18n.translate('error.general_error'));
        }
    }

    /**
     * [Admin/Shop Only] Manually confirm a payment
     */
    @Post(':paymentId/confirm')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Manually confirm a payment (e.g., Bank transfer)' })
    @ApiParam({ name: 'paymentId', type: 'string', description: 'شناسه پرداخت' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                referenceId: { type: 'string', description: 'شماره پیگیری بانکی یا مرجع' }
            }
        }
    })
    @ApiOkResponse({
        description: 'پرداخت با موفقیت تایید شد.',
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
                throw new BadRequestException(error.message || this.i18n.translate('error.validation_error'));
            }
            throw new InternalServerErrorException(error.message || this.i18n.translate('error.general_error'));
        }
    }
}