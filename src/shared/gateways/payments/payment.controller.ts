import {
    BadRequestException,
    Body,
    Controller,
    Get,
    HttpStatus,
    Logger,
    Post,
    Query,
    Res,
    UseGuards,
} from '@nestjs/common';
import {Response} from 'express';
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiBody,
    ApiCreatedResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiResponse,
    ApiTags,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import {PaymentService} from './payment.service';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {I18nService} from 'nestjs-i18n';
import {Transaction, TransactionStatus} from '../../transaction/transaction.entity';
import {AppointmentType} from '../../../modules/vet&clinic/entities/appointment.entity';
import {ConsultationStatus} from '../../../socket/consultation/consultation.entity';

// Guards و Decorators
import {JwtAuthGuard} from "../../auth/guards/jwt-auth.guard";
import {CurrentUser} from "../../auth/guards/current-user.decorator";
import {User} from "../../user/entities/user.entity";
import {OrderType} from "../../order/order-type.enum";
import {OrderPaymentDto, PayDto} from "./dto/payment.dto";
import {BlacklistGuard} from "../../auth/guards/blacklist.guard";

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')

export class PaymentController {
    private readonly logger = new Logger(PaymentController.name);

    constructor(
        private readonly i18n: I18nService,
        private readonly paymentService: PaymentService,
        @InjectRepository(Transaction)
        private readonly txRepo: Repository<Transaction>,
    ) {}

    // ===============================
    // 1️⃣ پرداخت عمومی
    // ===============================
    @Post('pay')
    @UseGuards(JwtAuthGuard,BlacklistGuard)
    @ApiOperation({ summary: 'شروع فرآیند پرداخت عمومی' })
    @ApiBody({ type: PayDto })
    @ApiCreatedResponse({ description: 'درخواست پرداخت ثبت شد.' })
    @ApiBadRequestResponse({ description: 'مبلغ نامعتبر است.' })
    async pay(@Body() dto: PayDto) {
        const { amount, meta, supporterInfo } = dto;
        if (!amount || amount <= 0) {
            throw new BadRequestException(this.i18n.translate('error.invalid_amount'));
        }
        return this.paymentService.startPayment(
            process.env.GATEWAY_NAME ?? 'zarinpal',
            amount,
            meta,
            supporterInfo
        );
    }

    @Get('callback')
    @ApiOperation({ summary: 'کالبک پرداخت عمومی' })
    async callback(
        @Query('tx') txId: string,
        @Query() query: any,
        @Res() res: Response,
    ) {
        try {
            // ✅ Idempotency Check
            const existingTx = await this.txRepo.findOne({ where: { id: txId } });
            if (existingTx && existingTx.status === TransactionStatus.SUCCESS) {
                res.redirect(`${process.env.FRONTEND_SUCCESS_URL}?order=${existingTx.order.id}&ref=${existingTx.refId}`);
                return;
            }

            const result = await this.paymentService.verifyPayment(
                process.env.GATEWAY_NAME ?? 'zarinpal',
                query,
                txId,
            );

            if (result.success) {
                res.redirect(`${process.env.FRONTEND_SUCCESS_URL}?order=${result.orderId}&ref=${result.refId}`);
            } else {
                res.redirect(`${process.env.FRONTEND_FAILED_URL}?order=${result.orderId}`);
            }
        } catch (e) {
            // ✅ امن‌سازی لاگ
            this.logger.error(`General Callback Error: ${e.message}`);
            res.redirect(`${process.env.FRONTEND_FAILED_URL}?error=verify_failed`);
        }
    }

    // ===============================
    // 2️⃣ شارژ کیف پول
    // ===============================
    @Post('pay-wallet')
    @UseGuards(JwtAuthGuard,BlacklistGuard)
    @ApiOperation({ summary: 'شارژ کیف پول' })
    @ApiBody({ type: PayDto })
    @ApiCreatedResponse({ description: 'درخواست شارژ کیف پول ثبت شد.' })
    @ApiUnauthorizedResponse({ description: 'احراز هویت لازم است.' })
    async payWallet(
        @CurrentUser() user: User,
        @Body() dto: PayDto,
    ) {
        if (!user?.id) {
            throw new BadRequestException(this.i18n.translate('error.unauthorized'));
        }
        return this.paymentService.startPaymentForWallet(
            process.env.GATEWAY_NAME ?? 'zarinpal',
            dto.amount,
            dto.meta,
            user.id,
        );
    }

    @Get('callback-wallet')
    @ApiOperation({ summary: 'کالبک شارژ کیف پول' })
    async callbackWallet(
        @Query('tx') txId: string,
        @Query() query: any,
        @Res() res: Response,
    ) {
        try {
            // ✅ Idempotency Check
            const existingTx = await this.txRepo.findOne({ where: { id: txId } });
            if (existingTx && existingTx.status === TransactionStatus.SUCCESS) {
                res.redirect(`${process.env.FRONTEND_SUCCESS_URL_WALLET}?wallet=charged&ref=${existingTx.refId}`);
                return;
            }

            const result = await this.paymentService.verifyPaymentForWallet(
                process.env.GATEWAY_NAME ?? 'zarinpal',
                query,
                txId,
            );

            if (result.success) {
                res.redirect(`${process.env.FRONTEND_SUCCESS_URL_WALLET}?wallet=charged&ref=${result.refId}`);
            } else {
                res.redirect(`${process.env.FRONTEND_FAILED_URL_WALLET}?wallet=failed`);
            }
        } catch (e) {
            this.logger.error(`Wallet Callback Error: ${e.message}`);
            res.redirect(`${process.env.FRONTEND_FAILED_URL_WALLET}?error=wallet_verify_failed`);
        }
    }

    // ===============================
    // 3️⃣ پرداخت مارکت‌پلیس
    // ===============================
    @Post('pay-market')
    @UseGuards(JwtAuthGuard,BlacklistGuard)
    @ApiOperation({ summary: 'پرداخت سفارش مارکت‌پلیس' })
    @ApiBody({ type: OrderPaymentDto })
    @ApiCreatedResponse({ description: 'درخواست پرداخت سفارش ثبت شد.' })
    @ApiUnauthorizedResponse({ description: 'احراز هویت لازم است.' })
    @ApiBadRequestResponse({ description: 'شناسه سفارش یا فروشنده الزامی است.' })
    async payMarket(
        @CurrentUser() user: User,
        @Body() dto: OrderPaymentDto,
    ) {
        const { orderId, amount, tenantId, meta } = dto;

        if (!user?.id) {
            throw new BadRequestException(this.i18n.translate('error.unauthorized'));
        }
        if (!orderId || !tenantId) {
            throw new BadRequestException(this.i18n.translate('error.required_fields_missing'));
        }

        return this.paymentService.startPaymentForMarketOrder(
            process.env.GATEWAY_NAME ?? 'zarinpal',
            amount,
            meta || { description: this.i18n.translate('payment.market_order_desc', { args: { id: orderId } }) },
            orderId,
            user.id,
            tenantId,
        );
    }

    @Get('callback-market')
    @ApiOperation({ summary: 'کالبک پرداخت مارکت‌پلیس' })
    async callbackMarket(
        @Query('tx') txId: string,
        @Query() query: any,
        @Res() res: Response,
    ) {
        try {
            // ✅ Idempotency Check
            const existingTx = await this.txRepo.findOne({ where: { id: txId } });
            if (existingTx && existingTx.status === TransactionStatus.SUCCESS) {
                res.redirect(
                    `${process.env.FRONTEND_SUCCESS_URL_MARKET}/order/success?code=${existingTx.order?.orderCode}&ref=${existingTx.refId}`
                );
                return;
            }


            const result = await this.paymentService.verifyPaymentForMarketOrder(
                process.env.GATEWAY_NAME ?? 'zarinpal',///TODO:set online
                query,
                txId,
            );

            if (result.success && !result.needsManualReview) {
                res.redirect(
                    `${process.env.FRONTEND_SUCCESS_URL_MARKET}/order/success?code=${result.orderCode}&ref=${result.refId}&amount=${result.amount}&deliveryDate=${result.deliveryDate}&deliveryTime=${result.deliveryTime}`
                );
            } else if (result.needsManualReview || query.Status === 'OK') {
                res.redirect(
                    `${process.env.FRONTEND_SUCCESS_URL_MARKET}/review-payment?txId=${txId}&orderId=${result.orderCode || result.orderId}&error=${encodeURIComponent(result.error || this.i18n.translate('payment.manual_review_needed'))}`
                );
            } else {
                res.redirect(
                    `${process.env.FRONTEND_SUCCESS_URL_MARKET}/error?order=${result.orderCode || result.orderId}&status=failed&message=${encodeURIComponent(result.message || this.i18n.translate('payment.failed'))}`
                );
            }
        } catch (e) {
            this.logger.error(`Market Callback Error: ${e.message}`);
            if (query.Status === 'OK') {
                res.redirect(`${process.env.FRONTEND_SUCCESS_URL_MARKET}/review-payment?txId=${txId}`);
            } else {
                res.redirect(`${process.env.FRONTEND_SUCCESS_URL_MARKET}/error?error=verify_failed`);
            }
        }
    }

    // ===============================
    // 4️⃣ پرداخت کلینیک دامپزشکی
    // ===============================
    @Post('pay-vet-clinic')
    @UseGuards(JwtAuthGuard,BlacklistGuard)
    @ApiOperation({ summary: 'پرداخت نوبت کلینیک' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                orderId: { type: 'string' },
                amount: { type: 'number' },
                tenantId: { type: 'string' },
                meta: { type: 'object' },
            },
        },
    })
    @ApiCreatedResponse({ description: 'درخواست پرداخت نوبت ثبت شد.' })
    @ApiUnauthorizedResponse({ description: 'احراز هویت لازم است.' })
    async payVetClinic(
        @CurrentUser() user: User,
        @Body('orderId') orderId: string,
        @Body('amount') amount: number,
        @Body('tenantId') tenantId: string,
        @Body('meta') meta?: any,
    ) {
        if (!user?.id) {
            throw new BadRequestException(this.i18n.translate('error.unauthorized'));
        }
        if (!orderId || !tenantId) {
            throw new BadRequestException(this.i18n.translate('error.required_fields_missing'));
        }

        return this.paymentService.startPaymentForVetClinic(
            process.env.GATEWAY_NAME ?? 'zarinpal',
            amount,
            meta || { description: this.i18n.translate('payment.clinic_visit_desc', { args: { id: orderId } }) },
            orderId,
            user.id,
            tenantId,
        );
    }

    @Get('callback-vet-clinic')
    @ApiOperation({ summary: 'کالبک پرداخت کلینیک' })
    async callbackVetClinic(
        @Query('tx') txId: string,
        @Query() query: any,
        @Res() res: Response,
    ) {
        try {
            // ✅ Idempotency Check
            const existingTx = await this.txRepo.findOne({ where: { id: txId } });
            if (existingTx && existingTx.status === TransactionStatus.SUCCESS) {
                res.redirect(`${process.env.FRONTEND_SUCCESS_URL_VET}/appointments/confirm?code=${existingTx.order?.orderCode}`);
                return;
            }

            const result = await this.paymentService.verifyPaymentForVetClinic(
                process.env.GATEWAY_NAME ?? 'zarinpal',
                query,
                txId,
            );

            if (result.success) {
                const visitType = result.visitType || AppointmentType.IN_PERSON;
                const baseUrl = process.env.FRONTEND_SUCCESS_URL_VET;
                let redirectUrl: string;

                const commonParams = {
                    serviceType: result.serviceType,
                    trackingCode: result.orderCode,
                    doctor: result.doctorName || 'دکتر کلینیک',
                    specialty: result.specialty || 'دامپزشک',
                };

                switch (visitType) {
                    case AppointmentType.ONLINE_CHAT: {
                        const consultation = await this.paymentService.createOrUpdateConsultation({
                            userId: result.userId,
                            tenantId: result.tenantId,
                            petId: result.petId,
                            orderId: result.orderCode,
                            appointment: result.appointment,
                            requestStatus: ConsultationStatus.REQUEST_SENT,
                            specialty: commonParams.specialty,
                        } as any);

                        await this.paymentService.setConsultationToAppointment(result.appointment.id, consultation.id);

                        const url = new URL(`${baseUrl}/vet/${result.tenantId}`);
                        Object.entries(commonParams).forEach(([k, v]) => url.searchParams.append(k, v as string));
                        url.searchParams.append('consultationId', consultation.id);
                        url.searchParams.append('status', 'request-sent');
                        redirectUrl = url.toString();
                        break;
                    }
                    case AppointmentType.PHONE_INSTANT:
                    case AppointmentType.PHONE_SCHEDULED: {
                        const url = new URL(`${baseUrl}/vet/${result.tenantId}`);
                        Object.entries(commonParams).forEach(([k, v]) => url.searchParams.append(k, v as string));
                        url.searchParams.append('consultationId', <string>result.orderCode);
                        url.searchParams.append('status', 'request-sent');
                        redirectUrl = url.toString();
                        break;
                    }
                    case AppointmentType.HOME_VISIT:
                    case AppointmentType.IN_PERSON: {
                        const url = new URL(`${baseUrl}/checkout`);
                        Object.entries(commonParams).forEach(([k, v]) => url.searchParams.append(k, v as string));
                        url.searchParams.append('paymentRef', result.refId || '');
                        url.searchParams.append('paymentDate', result.paymentDate ? new Date(result.paymentDate).toISOString() : '');
                        url.searchParams.append('servicePrice', result.servicePrice ? String(result.servicePrice) : '0');
                        url.searchParams.append('type', commonParams.serviceType);
                        redirectUrl = url.toString();
                        break;
                    }
                    default: {
                        const url = new URL(`${baseUrl}/appointments/confirm`);
                        url.searchParams.append('code', <string>result.orderCode);
                        redirectUrl = url.toString();
                    }
                }

                res.redirect(redirectUrl);
            } else if (result.needsManualReview || result.error) {
                res.redirect(`${process.env.FRONTEND_SUCCESS_URL_VET}/review-payment?txId=${txId}&orderId=${result.orderId}`);
            } else {
                res.redirect(`${process.env.FRONTEND_SUCCESS_URL_VET}/error?order=${result.orderCode}&status=failed`);
            }
        } catch (e) {
            this.logger.error(`Vet Clinic Callback Error: ${e.message}`);
            if (query.Status === 'OK') {
                res.redirect(`${process.env.FRONTEND_SUCCESS_URL_VET}/review-payment?txId=${txId}`);
            } else {
                res.redirect(`${process.env.FRONTEND_SUCCESS_URL_VET}/error?error=verify_failed`);
            }
        }
    }

    // ===============================
    // 5️⃣ پرداخت داروخانه
    // ===============================
    @Post('pay-pharmacy')
    @UseGuards(JwtAuthGuard,BlacklistGuard)
    @ApiOperation({ summary: 'پرداخت سفارش داروخانه' })
    @ApiBody({ type: OrderPaymentDto })
    @ApiCreatedResponse({ description: 'درخواست پرداخت داروخانه ثبت شد.' })
    @ApiUnauthorizedResponse({ description: 'احراز هویت لازم است.' })
    async payPharmacy(
        @CurrentUser() user: User,
        @Body() dto: OrderPaymentDto,
    ) {
        const { orderId, amount, tenantId, meta } = dto;

        if (!user?.id) {
            throw new BadRequestException(this.i18n.translate('error.unauthorized'));
        }
        if (!orderId || !tenantId) {
            throw new BadRequestException(this.i18n.translate('error.required_fields_missing'));
        }

        return this.paymentService.startPaymentForPharmacyOrder(
            process.env.GATEWAY_NAME ?? 'zarinpal',
            amount,
            meta || { description: this.i18n.translate('payment.pharmacy_order_desc', { args: { id: orderId } }) },
            orderId,
            user.id,
            tenantId,
        );
    }

    @Get('callback-pharmacy')
    @ApiOperation({ summary: 'کالبک پرداخت داروخانه' })
    async callbackPharmacy(
        @Query('tx') txId: string,
        @Query() query: any,
        @Res() res: Response,
    ) {
        try {

            const result = await this.paymentService.verifyPaymentForPharmacyOrder(
                process.env.GATEWAY_NAME ?? 'zarinpal',
                query,
                txId,
            );

            if (result.success && !result.needsManualReview) {
                const isPharmacyOrder = result.orderType === 'PRESCRIPTION' || result.orderType === 'NONE_PRESCRIPTION';

                if (isPharmacyOrder) {
                    res.redirect(
                        `${process.env.FRONTEND_SUCCESS_URL_PHARMACY}/pharmacy/order-status/${result.orderId}?orderCode=${result.orderCode}&new=true`
                    );
                } else {
                    const encodedCustomerInfo = encodeURIComponent(JSON.stringify(result.customerInfo));
                    const encodedItems = encodeURIComponent(JSON.stringify(result.items));
                    res.redirect(
                        `${process.env.FRONTEND_SUCCESS_URL_PHARMACY}/pharmacy/order-success?orderId=${result.orderId}&code=${result.orderCode}&ref=${result.refId}&amount=${result.amount}&deliveryDate=${result.deliveryDate}&deliveryTime=${result.deliveryTime}&customerInfo=${encodedCustomerInfo}&items=${encodedItems}`
                    );
                }
            } else if (result.needsManualReview) {
                res.redirect(
                    `${process.env.FRONTEND_SUCCESS_URL_PHARMACY}/review-payment?txId=${txId}&orderId=${result.orderCode || result.orderId}&error=${encodeURIComponent(result.error || '')}`
                );
            } else {
                res.redirect(
                    `${process.env.FRONTEND_SUCCESS_URL_PHARMACY}/error?order=${result.orderCode || result.orderId}&status=failed&message=${encodeURIComponent(result.message || this.i18n.translate('payment.failed'))}`
                );
            }
        } catch (e) {
            this.logger.error(`Pharmacy Callback Error: ${e.message}`);
            if (query.Status === 'OK') {
                res.redirect(`${process.env.FRONTEND_SUCCESS_URL_PHARMACY}/review-payment?txId=${txId}`);
            } else {
                res.redirect(`${process.env.FRONTEND_SUCCESS_URL_PHARMACY}/error?error=verify_failed`);
            }
        }
    }

    // ===============================
    // 6️⃣ بررسی وضعیت تراکنش
    // ===============================
    @Get('check-status')
    @ApiOperation({ summary: 'بررسی وضعیت تراکنش' })
    @ApiParam({ name: 'txId', description: 'شناسه تراکنش' })
    @ApiOkResponse({ description: 'وضعیت تراکنش بازیابی شد.' })
    @ApiResponse({ status: 404, description: 'تراکنش یافت نشد.' })
    async checkPaymentStatus(@Query('txId') txId: string, @Res() res: Response) {
        const tx = await this.txRepo.findOne({
            where: { id: txId },
            relations: ['order', 'order.appointment'],
        } as any);

        if (!tx) {
            return res.status(HttpStatus.NOT_FOUND).json({ error: this.i18n.translate('error.transaction_not_found') });
        }

        if (tx.status === TransactionStatus.SUCCESS) {
            return res.json({
                success: true,
                orderCode: tx.order?.orderCode,
                appointment: tx.order?.appointment,
                message: this.i18n.translate('payment.success_message'),
            });
        } else {
            return res.json({
                success: false,
                message: this.i18n.translate('payment.pending_message'),
            });
        }
    }
}