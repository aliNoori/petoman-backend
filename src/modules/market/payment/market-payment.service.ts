import {DataSource, EntityManager} from 'typeorm';
import {BadRequestException, Injectable, InternalServerErrorException, NotFoundException} from '@nestjs/common';
import {I18nService} from 'nestjs-i18n';
import {TenantContext} from '../../../tenants/tenant-context.service';
import {Order} from '../../../shared/order/order.entity';
import {OrderStatus} from '../../../shared/order/order-status.enum';
import {Payment} from '../../../shared/gateways/payments/payment.entity';
import {PaymentStatus} from '../../../shared/gateways/payments/payment-status-machine.enum';
import {WalletService} from '../../../shared/wallet/wallet.service';
import {WalletType} from '../../../shared/wallet/wallet.entity';
import {ProductOrderItem} from '../order/product-order-item.entity';
import {MarketProduct} from '../product/entities/product.entity';
import {MarketPaymentMethodEnum, MarketSubmitOrderDto} from "../order/dto/market-order.dto";
import {OrderType} from '../../../shared/order/order-type.enum';
import {Transaction, TransactionStatus, TransactionType} from '../../../shared/transaction/transaction.entity';
import {WalletTransactionType} from '../../../shared/wallet/wallet-transaction.entity';
import {OrderStateMachineService} from './order-state-machine.service';
import {ProductVariant} from '../product/entities/product-variant.entity';
import {NotificationService} from '../../../shared/notification/notification.service';
import {NotificationType} from '../../../shared/notification/notification.entity';
import {User} from '../../../shared/user/entities/user.entity';
import {InjectQueue} from '@nestjs/bull';
import {Queue} from 'bull';
import {Tenant} from '../../../core/entities/tenant.entity';
import {DiscountService} from '../../../shared/discount/discount.service';

interface IProcessedOrderItem {
    productId: string;
    variantId?: string;
    price: number;
    quantity: number;
    originalPrice?: number;
}

@Injectable()
export class MarketPaymentService {
    private readonly platformFeePercent = 5;

    constructor(
        @InjectQueue('send-sms') private smsQueue: Queue,
        private notifService: NotificationService,
        private dataSource: DataSource,
        private walletService: WalletService,
        private tenantContext: TenantContext,
        private orderStateMachine: OrderStateMachineService,
        private discountService: DiscountService,
        private i18n: I18nService
    ) {
    }

    async submitOrderAndPay(payload: MarketSubmitOrderDto, userId: string) {
        if (!Object.values(MarketPaymentMethodEnum).includes(payload.paymentMethod)) {
            throw new BadRequestException(this.i18n.translate('error.validation_error'));
        }

        const result = await this.processOrderLogic(payload, userId);

        if (payload.paymentMethod === MarketPaymentMethodEnum.ONLINE) {
            return {
                requiresAction: true,
                actionType: 'ONLINE_PAYMENT_REDIRECT',
                data: {
                    orderId: result.order.id,
                    paymentId: result.payment.id,
                    amount: result.payment.amount,
                    tenantId: payload.sellerId,
                    redirectUrl: null
                }
            };
        }

        return {
            requiresAction: false,
            actionType: 'ORDER_COMPLETED',
            data: {
                code: result.order.orderCode,
                ref: result.payment.referenceId,
                status: result.payment.status,
                amount: result.payment.amount,
                deliveryDate: result.order.metadata?.deliveryDate,
                deliveryTime: result.order.metadata?.deliveryTime,
                redirectUrl: null
            }
        };
    }

    private async processOrderLogic(payload: MarketSubmitOrderDto, userId: string) {
        return this.dataSource.transaction(async (manager) => {
            // 1. Calculate totals and check stock
            const {calculatedTotal, shippingCost, itemsPayload, discountInfo} =
                await this.calculateOrderTotals(manager, payload, userId);

            // 3. Create Order and Payment Records
            const orderAndPayment = await this.createOrderRecords(
                manager,
                payload,
                userId,
                calculatedTotal,
                shippingCost,
                itemsPayload,
                discountInfo
            );

            // 4. Process Payment Method
            if (payload.paymentMethod === MarketPaymentMethodEnum.WALLET) {
                await this.processWalletPayment(manager, orderAndPayment.payment, userId, payload.sellerId);
            }

            // 5. Finalize Payment
            if (payload.paymentMethod === MarketPaymentMethodEnum.WALLET) {
                await this.finalizePayment(manager, orderAndPayment.payment, 'WALLET', orderAndPayment.order.id);
            }

            return {
                order: orderAndPayment.order,
                payment: orderAndPayment.payment,
                calculatedTotal
            };
        });
    }

    private async calculateOrderTotals(manager: EntityManager, payload: MarketSubmitOrderDto, userId: string) {
        let calculatedTotal = 0;
        let shippingCost = 0;
        let timeslotsCost = 0;
        const itemsPayload: IProcessedOrderItem[] = [];
        let discountInfo;

        const tenant = await manager.findOne(Tenant, {
            where: {id: payload.sellerId},
            relations: ['settings']
        } as any)

        const shippingSettings = (tenant as any)?.settings?.find((s: any) => s.key === 'shipping_methods');

        if (!shippingSettings) {
            throw new BadRequestException(this.i18n.translate('error.setting_not_found'));

        }

        const methods = shippingSettings.value?.methods

        const selectedMethod = methods.find((m) => m.type === payload.shippingMethod);

        if (!selectedMethod || !selectedMethod.isActive) {
            throw new BadRequestException(this.i18n.translate('error.shipping_methods_not_enabled'));
        }

        if (payload.shippingMethod === 'inPerson') {
            shippingCost = 0;
        } else {

            shippingCost = Number(selectedMethod.price) || 0;
        }

        const timeSlots = (tenant as any)?.settings?.find((s: any) => s.key === 'timeSlots');

        if (!timeSlots) {
            throw new BadRequestException(this.i18n.translate('error.setting_not_found'));

        }

        const slots = timeSlots.value?.slots

        const selectedSlots = slots.find((s) => s.id === payload.deliveryTimeSlot.id);

        timeslotsCost = Number(selectedSlots.price) || 0

        // 1. Process Each Item
        for (const item of payload.items) {
            const quantity = Number(item.quantity);
            if (quantity < 1) {
                throw new BadRequestException(this.i18n.translate('error.validation_error'));
            }

            let finalPrice = 0;
            let targetProductId = '';
            let targetVariantId: string | undefined;

            if (item.variantId) {
                const variant = await manager.createQueryBuilder(ProductVariant, 'variant')
                    .innerJoin('variant.marketProduct', 'mp')
                    .innerJoin('mp.product', 'p')
                    .where('variant.id = :variantId', {variantId: item.variantId})
                    .setLock('pessimistic_write') // اعمال قفل
                    .getOne();

                if (!variant) {
                    throw new NotFoundException(this.i18n.translate('variant.not_found'));
                }

                if (variant.stock < quantity) {
                    throw new BadRequestException(this.i18n.translate('product.stock_insufficient'));
                }

                finalPrice = variant.price > 0 ? variant.price : variant.marketProduct.price;
                targetProductId = variant.marketProductId;
                targetVariantId = item.variantId;

                await manager.increment(ProductVariant, {id: item.variantId}, 'stock', -quantity);

            } else {
                const product = await manager.createQueryBuilder(MarketProduct, 'mp')
                    .innerJoin('mp.product', 'p')
                    .where('mp.id = :productId AND mp.tenantId = :tenantId', {
                        productId: item.productId,
                        tenantId: payload.sellerId
                    })
                    .setLock('pessimistic_write') // اعمال قفل
                    .getOne();

                if (!product) {
                    throw new NotFoundException(this.i18n.translate('product.not_found'));
                }

                if (product.stock < quantity) {
                    throw new BadRequestException(this.i18n.translate('product.stock_insufficient'));
                }

                if (product.hasDiscount && product.discountedPrice > 0) {
                    finalPrice = product.discountedPrice;
                } else {
                    finalPrice = product.price;
                }

                targetProductId = product.id;
                await manager.increment(MarketProduct, {id: item.productId}, 'stock', -quantity);
            }

            calculatedTotal += finalPrice * quantity;

            itemsPayload.push({
                productId: targetProductId,
                variantId: targetVariantId,
                price: finalPrice,
                quantity
            });
        }

        calculatedTotal += shippingCost + timeslotsCost;
        if (calculatedTotal < 0) calculatedTotal = 0;

        // Now apply discount if exists
        if (payload.discountCode) {
            try {
                discountInfo = await this.discountService.validateAndApplyDiscount(
                    manager,
                    payload.discountCode,
                    userId, // فرض بر این است که userId در payload وجود دارد یا از context گرفته می‌شود
                    calculatedTotal,true
                );
                calculatedTotal -= discountInfo.discountAmount;
            } catch (error) {
                //throw new BadRequestException(this.i18n.translate('error.validation_error'));
                console.warn('Invalid discount code, proceeding without discount:', error);
                discountInfo = null;
            }
        }
        return {calculatedTotal, shippingCost, itemsPayload, discountInfo};
    }

    private async createOrderRecords(
        manager: EntityManager,
        payload: MarketSubmitOrderDto,
        userId: string,
        calculatedTotal: number,
        shippingCost: number,
        itemsPayload: IProcessedOrderItem[],
        discountInfo: any
    ) {
        const order = manager.create(Order, {
            userId,
            tenantId: payload.sellerId,
            type: OrderType.PRODUCT,
            status: OrderStatus.CUSTOMER_PENDING,
            totalAmount: calculatedTotal,
            note: payload.notes,
            addressId: payload.addressId,
            metadata: {
                deliveryDate: payload.deliveryDate.date,
                deliveryTime: payload.deliveryTimeSlot.time,
                shippingMethod: payload.shippingMethod,
                shippingCost: shippingCost,
                discountCode: payload.discountCode,
                itemsCount: payload.items.length
            }
        });

        const savedOrder = await manager.save(order);

        const itemsToSave = itemsPayload.map((p) => ({
            ...p,
            orderId: savedOrder.id,
            price: p.price
        }));

        await manager.save(ProductOrderItem, itemsToSave);

        const payment = manager.create(Payment, {
            tenantId: payload.sellerId,
            orderId: savedOrder.id,
            userId,
            amount: calculatedTotal,
            status: payload.paymentMethod === MarketPaymentMethodEnum.WALLET
                ? PaymentStatus.PAID
                : PaymentStatus.PENDING,
            method: payload.paymentMethod,
            metadata: {
                referenceId: null,
                createdAt: new Date()
            }
        });

        const savedPayment = await manager.save(payment);

        return {order: savedOrder, payment: savedPayment};
    }

    private async processWalletPayment(
        manager: EntityManager,
        payment: Payment,
        userId: string,
        tenantId: string
    ) {
        const totalAmount = Number(payment.amount);

        const userWallet = await this.walletService.getWallet(undefined, userId, WalletType.USER, manager);
        const platformBankWallet = await this.walletService.getWallet(undefined, undefined, WalletType.PLATFORM_BANK, manager);
        const shopWallet = await this.walletService.getWallet(tenantId, undefined, WalletType.SHOP, manager);
        const petomanWallet = await this.walletService.getWallet(undefined, undefined, WalletType.PETOMAN, manager);

        if (Number(userWallet.balance) < totalAmount) {
            throw new BadRequestException(this.i18n.translate('wallet.balance_insufficient'));
        }

        const paymentId = payment.id;

        try {
            await this.walletService.executeTransaction(
                manager,
                userWallet,
                WalletTransactionType.DEBIT,
                totalAmount,
                `Order Payment ${payment.orderId}`,
                paymentId
            );

            await this.walletService.executeTransaction(
                manager,
                platformBankWallet,
                WalletTransactionType.CREDIT,
                totalAmount,
                `User to Platform Bank for Order ${payment.orderId}`,
                paymentId
            );

            const feeAmount = Math.floor((totalAmount * this.platformFeePercent) / 100);
            const shopAmount = totalAmount - feeAmount;

            await this.walletService.executeTransaction(
                manager,
                platformBankWallet,
                WalletTransactionType.DEBIT,
                feeAmount,
                `Platform Fee deduction for Order ${payment.orderId}`,
                paymentId
            );

            await this.walletService.executeTransaction(
                manager,
                petomanWallet,
                WalletTransactionType.CREDIT,
                feeAmount,
                `Platform Commission for Order ${payment.orderId}`,
                paymentId
            );

            await this.walletService.executeTransaction(
                manager,
                platformBankWallet,
                WalletTransactionType.DEBIT,
                shopAmount,
                `Seller share deduction from Platform Bank for Order ${payment.orderId}`,
                paymentId
            );

            await this.walletService.executeTransaction(
                manager,
                shopWallet,
                WalletTransactionType.CREDIT,
                shopAmount,
                `Seller share for Order ${payment.orderId}`,
                paymentId
            );

        } catch (error) {
            throw new InternalServerErrorException(this.i18n.translate('wallet.transaction_error'));
        }
    }

    async finalizePayment(manager: EntityManager, payment: Payment, gatewayName: string, refId?: string) {
        const order = await manager.findOne(Order, {
            where: {id: payment.orderId},
            relations: ['user']
        } as any);

        if (!order) {
            throw new NotFoundException(this.i18n.translate('order.not_found'));
        }

        if (gatewayName !== 'zarinpal') {
            const transaction = manager.create(Transaction, {
                gateway: gatewayName,
                amount: payment.amount,
                status: TransactionStatus.SUCCESS,
                refId: refId || payment.id,
                metadata: {type: TransactionType.MARKET_ORDER},
                order
            });
            order.transaction = await manager.save(transaction)
            await manager.save(order)
        }

        payment.status = PaymentStatus.PAID;
        payment.metadata = {...payment.metadata, referenceId: refId}
        await manager.save(payment);

        await this.orderStateMachine.transitionOrder(
            payment.orderId,
            OrderStatus.CUSTOMER_PAID,
            manager,
            'MARKET'
        );

        await this.sendNotifications(manager, order, payment.amount, gatewayName);
    }

    private async sendNotifications(manager: EntityManager, order: Order, amount: number, gateway: string) {
        await this.notifService.create({
            userId: order.userId,
            type: NotificationType.IN_APP,
            title: this.i18n.translate('order.payment_success_title'),
            message: this.i18n.translate('order.payment_success_message', {
                args: {code: order.orderCode, amount: amount}
            }),
            icon: 'shopping-bag',
            color: 'success',
            panelType: 'MARKET'
        });

        const user = await manager.findOne(User, {where: {id: order.userId}} as any);
        if (user?.phoneNumber) {
            this.smsQueue.add('handle-send-sms', {
                phoneNumber: user.phoneNumber,
                message: this.i18n.translate('order.sms_payment_success', {
                    args: {code: order.orderCode, amount: amount}
                })
            }).catch(console.error);
        }


        const tenant = await manager.findOne(Tenant, {
            where: {id: order.tenantId},
            select: ['id', 'ownerUserId']
        } as any);

        if (tenant?.ownerUserId) {
            await this.notifService.create({
                userId: tenant.ownerUserId,
                type: NotificationType.IN_APP,
                title: this.i18n.translate('order.new_order_title'),
                message: this.i18n.translate('order.new_order_message', {
                    args: {code: order.orderCode, amount: amount}
                }),
                icon: 'store',
                color: 'primary',
                panelType: 'SHOP-ADMIN'
            });
        }
    }

    async getPaymentStatus(paymentId: string, userId: string) {
        const tenantId = this.tenantContext.getTenantId();
        const payment = await this.dataSource.getRepository(Payment).findOne({
            where: {id: paymentId, tenantId, userId}
        });
        if (!payment) {
            throw new NotFoundException(this.i18n.translate('payment.not_found'));
        }
        return payment;
    }

    async cancelPayment(paymentId: string, userId: string) {
        return this.dataSource.transaction(async (manager) => {
            const tenantId = this.tenantContext.getTenantId();
            const payment = await manager.findOne(Payment, {
                where: {id: paymentId, tenantId, userId, status: PaymentStatus.PENDING}
            } as any);
            if (!payment) {
                throw new NotFoundException(this.i18n.translate('payment.not_found'));
            }

            payment.status = PaymentStatus.CANCELED;
            await manager.save(payment);

            await manager.update(Order, {id: payment.orderId}, {status: OrderStatus.CUSTOMER_CANCELLED});

            return {success: true};
        });
    }

    async manualConfirmPayment(paymentId: string, userId: string, referenceId?: string) {
        return this.dataSource.transaction(async (manager) => {
            const payment = await manager.findOne(Payment, {
                where: {id: paymentId, status: PaymentStatus.PENDING}
            } as any);
            if (!payment) {
                throw new NotFoundException(this.i18n.translate('payment.not_found'));
            }

            payment.status = PaymentStatus.PAID;
            if (referenceId) {
                payment.metadata = {...payment.metadata, referenceId};
            }
            await manager.save(payment);

            await this.finalizePayment(manager, payment, 'MANUAL', referenceId);

            return {success: true};
        });
    }

    /**
     * Verify Online Payment (Webhook/Callback)
     * This method is called by the payment gateway after the user completes the payment.
     * It verifies the payment status and updates the order/payment records accordingly.
     *
     * @param gateway The name of the payment gateway (e.g., 'zarinpal', 'nextpay')
     * @param callbackData The data received from the payment gateway webhook
     * @returns Verification result
     */
    async verifyOnlinePayment(gateway: string, callbackData: any) {
        // Extract transaction ID from callback data
        // The structure of callbackData depends on the gateway.
        // Typically, it contains a 'refId' or 'transactionId' that matches the payment ID.
        const refId = callbackData?.refId || callbackData?.transactionId || callbackData?.status;

        if (!refId) {
            // If no refId is found, we cannot identify the payment.
            // However, for webhooks, we usually return 200 OK to prevent retries,
            // even if the data is incomplete. The logging should capture this.
            console.warn(`Invalid callback data received from gateway ${gateway}: No refId found.`);
            return {
                success: false,
                message: 'Invalid callback data: Missing refId.'
            };
        }

        return this.dataSource.transaction(async (manager) => {
            // 1. Find the payment record using the refId
            // Note: The refId from the gateway might be the Payment ID or a Reference ID.
            // Assuming refId matches the Payment ID for simplicity.
            // In a real scenario, you might need to look up the payment by a different field.
            const payment = await manager.findOne(Payment, {
                where: {id: refId},
                relations: ['order']
            });

            if (!payment) {
                console.error(`Payment not found with refId: ${refId}`);
                return {
                    success: false,
                    message: 'Payment not found.'
                };
            }

            // 2. Check if the payment is already completed
            if (payment.status === PaymentStatus.PAID) {
                console.log(`Payment ${payment.id} is already completed.`);
                return {
                    success: true,
                    message: 'Payment already completed.',
                    orderId: payment.orderId
                };
            }

            // 3. Verify the payment with the gateway's API
            // This step depends on the specific gateway's verification API.
            // For example, for Zarinpal, you would call their verification endpoint.
            let verificationResult;
            try {
                // Assuming you have a GatewayService that handles different gateways
                // verificationResult = await this.gatewayService.verifyPayment(gateway, refId, callbackData);

                // For demonstration, we'll simulate a successful verification
                // In production, you MUST call the gateway's verification API
                verificationResult = {
                    success: true,
                    refId: refId,
                    message: 'Payment verified successfully.'
                };
            } catch (error) {
                console.error(`Error verifying payment with gateway ${gateway}:`, error);
                return {
                    success: false,
                    message: 'Payment verification failed.'
                };
            }

            // 4. If verification is successful, update the payment and order status
            if (verificationResult.success) {

                // Update payment status to PAID
                payment.status = PaymentStatus.PAID;
                payment.metadata = {
                    ...payment.metadata,
                    gatewayRefId: refId,
                    verifiedAt: new Date()
                };
                await manager.save(payment);

                // Finalize the payment (update order status, send notifications, etc.)
                await this.finalizePayment(manager, payment, gateway, refId);

                return {
                    success: true,
                    message: 'Payment verified and order processed successfully.',
                    orderId: payment.orderId
                };
            } else {
                // If verification fails, update payment status to FAILED
                payment.status = PaymentStatus.FAILED;
                await manager.save(payment);

                return {
                    success: false,
                    message: 'Payment verification failed. Payment marked as failed.'
                };
            }
        });
    }
}