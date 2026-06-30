import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
    ConflictException, // اضافه شده برای مدیریت تداخل‌ها
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { I18nService } from 'nestjs-i18n';

// Entities
import { Order } from '../../../shared/order/order.entity';
import { OrderStatus } from '../../../shared/order/order-status.enum';
import { Payment } from '../../../shared/gateways/payments/payment.entity';
import { PaymentStatus } from '../../../shared/gateways/payments/payment-status-machine.enum';
import { Transaction, TransactionStatus, TransactionType } from '../../../shared/transaction/transaction.entity';
import { User } from '../../../shared/user/entities/user.entity';
import { Tenant } from '../../../core/entities/tenant.entity';

// DTOs
import { PaymentMethodEnum, SubmitOrderDto } from '../../../shared/order/submit-order.dto';

// Services & Utils
import { TenantContext } from '../../../tenants/tenant-context.service';
import { WalletService } from '../../../shared/wallet/wallet.service';
import { WalletType } from '../../../shared/wallet/wallet.entity';
import { WalletTransactionType } from '../../../shared/wallet/wallet-transaction.entity';
import { NotificationService } from '../../../shared/notification/notification.service';
import { NotificationType } from '../../../shared/notification/notification.entity';
import { OrderStateMachineService } from './order-state-machine.service';

// Bull Queue
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

// Pharmacy/Market Entities
import { PharmacyMedicine } from '../medicine/pharmacy-medicine.entity';
import { OrderType } from '../../../shared/order/order-type.enum';
import { MarketProduct } from '../../market/product/entities/product.entity';
import { ProductOrderItem } from '../../market/order/product-order-item.entity';
import { ProductVariant } from '../../market/product/entities/product-variant.entity';
import {PharmacyOrderDto} from "./dto/pharmacy-order.dto";

interface IOrderItemInput {
    productId: string;
    variantId?: string;
    productName: string;
    price: number;
    quantity: number;
    medicineId?: string;
}

@Injectable()
export class PharmacyPaymentService {
    private readonly platformFeePercent = 5;

    constructor(
        @InjectQueue('send-sms') private readonly smsQueue: Queue,
        private readonly notifService: NotificationService,
        private readonly dataSource: DataSource,
        private readonly walletService: WalletService,
        private readonly tenantContext: TenantContext,
        private readonly orderStateMachine: OrderStateMachineService,
        private readonly i18n: I18nService,
        @InjectRepository(Transaction)
        private readonly txRepo: Repository<Transaction>,
        @InjectRepository(Order)
        private readonly orderRepo: Repository<Order>,
        @InjectRepository(Payment)
        private readonly paymentRepo: Repository<Payment>,
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        @InjectRepository(Tenant)
        private readonly tenantRepo: Repository<Tenant>,
    ) {}

    /**
     * Main entry point: Submit Order and Initiate Payment
     */
    async submitOrderAndPay(payload: PharmacyOrderDto, userId: string) {
        const isOnlinePayment = payload.paymentMethod === PaymentMethodEnum.ONLINE;

        if (!isOnlinePayment) {
            return this.processOrderLogic(payload, userId);
        }

        // --- پرداخت آنلاین ---
        const orderData = await this.createInitialOrder(payload, userId);

        return {
            requiresAction: true,
            actionType: 'ONLINE_PAYMENT_REDIRECT',
            data: {
                orderId: orderData.order.id,
                amount: orderData.calculatedTotal,
                tenantId: payload.sellerId,
                paymentId: orderData.payment.id,
            },
        };
    }

    /**
     * Internal helper to create initial order record without final payment completion
     */
    private async createInitialOrder(payload: PharmacyOrderDto, userId: string) {
        return this.dataSource.transaction(async (manager) => {
            const tenantId = payload.sellerId;
            let calculatedTotal = 0;
            const orderItemsToCreate: IOrderItemInput[] = [];

            // 1. Validate Items & Calculate Total (محصولات معمولی)
            if (payload.items && payload.items.length > 0) {
                for (const item of payload.items) {
                    let finalPrice = 0;
                    let productName = '';
                    let targetProductId = '';
                    let targetVariantId: string | undefined = undefined;

                    try {
                        if (item.variantId) {
                            const variant = await manager.findOne(ProductVariant, {
                                where: { id: item.variantId, marketProductId: item.productId },
                                lock: { mode: 'optimistic' },
                                relations: ['marketProduct.product'],
                            } as any);

                            if (!variant) {
                                throw new NotFoundException(this.i18n.translate('payment.not_found'));
                            }
                            if (variant.stock < item.quantity) {
                                throw new BadRequestException(this.i18n.translate('payment.insufficient_stock'));
                            }

                            finalPrice = variant.price > 0 ? variant.price : variant.marketProduct.price;
                            productName = `${variant.marketProduct.product.name} (${variant.name})`;
                            targetProductId = variant.marketProductId;
                            targetVariantId = item.variantId;

                            variant.stock -= item.quantity;
                            await manager.save(variant);
                        } else {
                            const product = await manager.findOne(MarketProduct, {
                                where: { id: item.productId, tenantId },
                                lock: { mode: 'optimistic' },
                                select: ['id', 'price', 'stock', 'discountedPrice', 'hasDiscount', 'discountType'],
                                relations: ['product'],
                            } as any);

                            if (!product) {
                                throw new NotFoundException(this.i18n.translate('payment.not_found'));
                            }
                            if (product.stock < item.quantity) {
                                throw new BadRequestException(this.i18n.translate('payment.insufficient_stock'));
                            }

                            finalPrice = product.hasDiscount ? product.discountedPrice : product.price;
                            productName = product.product.name;
                            targetProductId = product.id;

                            product.stock -= item.quantity;
                            await manager.save(product);
                        }
                    } catch (error) {
                        // مدیریت خطاهای Optimistic Lock یا تغییرات همزمان
                        if (error?.name === 'OptimisticLockVersionMismatchException' ||
                            error?.name === 'EntityNotFoundError' ||
                            error?.code === '23505') { // Unique violation
                            throw new ConflictException(this.i18n.translate('payment.stock_changed_during_process'));
                        }
                        throw error;
                    }

                    calculatedTotal += finalPrice * item.quantity;
                    orderItemsToCreate.push({
                        productId: targetProductId,
                        variantId: targetVariantId,
                        productName,
                        price: finalPrice,
                        quantity: item.quantity,
                    });
                }
            }

            // 2. Validate Medicines & Calculate Total (محصولات دارویی)
            if (payload.medicines && payload.medicines.length > 0) {
                for (const med of payload.medicines) {
                    try {
                        const medicine = await manager.findOne(PharmacyMedicine, {
                            where: { id: med.id, tenantId },
                            lock: { mode: 'optimistic' },
                            relations: ['medicine'],
                        } as any);

                        if (!medicine) {
                            throw new NotFoundException(this.i18n.translate('payment.not_found'));
                        }

                        if (medicine.stock < med.qty) {
                            throw new BadRequestException(this.i18n.translate('payment.insufficient_stock'));
                        }

                        if (medicine.stock) {
                            medicine.stock -= med.qty;
                            await manager.save(medicine);
                        }

                        const finalPrice = medicine.price;
                        const medicineName = medicine.medicine?.name || 'دارو بدون نام';
                        calculatedTotal += finalPrice * med.qty;

                        orderItemsToCreate.push({
                            medicineId: med.id,
                            productName: medicineName,
                            price: parseInt(String(finalPrice)),
                            quantity: med.qty,
                        } as any);
                    } catch (error) {
                        if (error?.name === 'OptimisticLockVersionMismatchException') {
                            throw new ConflictException(this.i18n.translate('payment.stock_changed_during_process'));
                        }
                        throw error;
                    }
                }
            }

            // 3. Calculate Shipping Cost
            const shippingCost = await this.calculateShippingCost(manager, payload, tenantId);

            const codFee = payload.codFee || 0;

            const hasItems = payload.items && payload.items.length > 0;
            const hasMedicines = payload.medicines && payload.medicines.length > 0;
            const isPrescriptionOnly = !hasItems && !hasMedicines && payload.mode === 'prescription';

            if (!isPrescriptionOnly) {
                calculatedTotal += shippingCost + codFee;
            }else{
                const depositAmount=50000///TODO:get settings tenant
                calculatedTotal+=depositAmount+shippingCost
            }

            // 4. Determine Order Type
            let orderType = OrderType.PRODUCT;
            if (payload.mode === 'prescription') {
                orderType = OrderType.PRESCRIPTION;
            } else if (hasMedicines || payload.mode === 'no-prescription') {
                orderType = OrderType.NONE_PRESCRIPTION;
            }

            // 5. Create Order
            const order = manager.create(Order, {
                userId,
                tenantId,
                type: orderType,
                status: OrderStatus.CUSTOMER_PENDING,
                totalAmount: calculatedTotal,
                note: payload.notes,
                addressId: payload.addressId,
                metadata: {
                    deliveryDate: payload.deliveryDate?.date,
                    deliveryTime: payload.deliveryTimeSlot?.time,
                    shippingMethod: payload.shippingMethod,
                    shippingCost: shippingCost,
                    customerInfo: payload.customerInfo,
                    prescriptionUrls: payload.prescriptionUrls || [],
                    mode: payload.mode,
                    isPrescriptionOnly: isPrescriptionOnly,
                },
            });

            const savedOrder = await manager.save(order);

            // 6. Create Order Items
            if (orderItemsToCreate.length > 0) {
                for (const item of orderItemsToCreate) {
                    await manager.save(ProductOrderItem, {
                        ...item,
                        orderId: savedOrder.id,
                    });
                }
            }

            // 7. Create Payment Record
            const payment = manager.create(Payment, {
                tenantId,
                orderId: savedOrder.id,
                userId,
                amount: calculatedTotal,
                status: PaymentStatus.PENDING,
                method: payload.paymentMethod,
                metadata: { referenceId: payload.transactionId ?? null },
            });

            const savedPayment = await manager.save(payment);

            return { order: savedOrder, payment: savedPayment, calculatedTotal };
        });
    }

    /**
     * Main method for processing non-online orders (Wallet, Card, COD)
     */
    private async processOrderLogic(payload: PharmacyOrderDto, userId: string) {
        return this.dataSource.transaction(async (manager) => {
            const result = await this.createInitialOrder(payload, userId);
            const savedOrder = result.order;
            const savedPayment = result.payment;

            let tx: Transaction | null = null;

            if (payload.paymentMethod === 'wallet') {
                tx = await this.processWalletPayment(manager, savedPayment, userId, payload.sellerId);
            } else if (payload.paymentMethod === 'card') {
                tx = await this.processCardPayment(manager, savedPayment, userId, payload.sellerId);
            } else if (payload.paymentMethod === 'cod') {
                tx = await this.processCodPayment(manager, savedPayment, userId, payload.sellerId);
            } else if (payload.paymentMethod === 'cash') {
                tx = await this.finalizePayment(manager, savedPayment, 'CASH', false, undefined);
            }

            if (!tx || !tx.order) {
                throw new InternalServerErrorException(this.i18n.translate('payment.order_processing_failed'));
            }

            // Fetch full order with relations for response
            const orderWithRelations = await manager.findOne(Order, {
                where: { id: savedOrder.id },
                relations: ['items', 'items.marketProduct', 'items.marketProduct.product', 'address'],
            } as any);

            if (!orderWithRelations) {
                throw new InternalServerErrorException(this.i18n.translate('payment.order_not_found_after_creation'));
            }

            return {
                success: true,
                requireAction: false,
                actionType:'ORDER_COMPLETED',
                orderId: orderWithRelations.id,
                orderCode: orderWithRelations.orderCode,
                amount: orderWithRelations.totalAmount,
                items: orderWithRelations.items.map((item) => {
                    const product = item.marketProduct?.product;
                    return {
                        id: item.id,
                        sellerId: item.marketProduct?.tenantId,
                        productId: item.productId,
                        name: product?.name || 'محصول بدون نام',
                        category: product?.categoryBreadcrumb || 'عمومی',
                        price: item.price,
                        quantity: item.quantity,
                        image: product?.image || null,
                        originalPrice: item.marketProduct?.price || item.price,
                    };
                }),
                customerInfo: {
                    ...(orderWithRelations.metadata?.customerInfo || {}),
                    address: orderWithRelations.address?.fullAddress || '',
                    city: orderWithRelations.address?.city || '',
                    postalCode: orderWithRelations.address?.postalCode || '',
                },
                deliveryDate: orderWithRelations.metadata?.deliveryDate,
                deliveryTime: orderWithRelations.metadata?.deliveryTime,
                refId: tx.refId,
                message:
                    payload.paymentMethod === 'wallet'
                        ? this.i18n.translate('payment.wallet_payment_success')
                        : this.i18n.translate('payment.order_registered_success'),
            };
        });
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
            throw new BadRequestException(this.i18n.translate('payment.insufficient_wallet_balance'));
        }

        // 1. Debit User Wallet
        await this.walletService.executeTransaction(
            manager,
            userWallet,
            WalletTransactionType.DEBIT,
            totalAmount,
            `پرداخت نوبت کلینیک شماره ${payment.orderId}`,
            payment.id
        );

        // 2. Credit Platform Bank Wallet
        await this.walletService.executeTransaction(
            manager,
            platformBankWallet,
            WalletTransactionType.CREDIT,
            totalAmount,
            `واریز از کاربر به صندوق پلتفرم بابت سفارش ${payment.orderId}`,
            payment.id
        );

        // 3. Calculate Fees
        const feeAmount = (totalAmount * this.platformFeePercent) / 100;
        const shopAmount = totalAmount - feeAmount;

        // 4. Distribute Platform Fee (Petoman)
        await this.walletService.executeTransaction(
            manager,
            platformBankWallet,
            WalletTransactionType.DEBIT,
            feeAmount,
            `کسر سهم پلتفرم (Petoman) از صندوق بابت سفارش ${payment.orderId}`,
            payment.id
        );
        await this.walletService.executeTransaction(
            manager,
            petomanWallet,
            WalletTransactionType.CREDIT,
            feeAmount,
            `سهم کارمزد پلتفرم (Petoman) از سفارش ${payment.orderId}`,
            payment.id
        );

        // 5. Distribute Shop Amount
        await this.walletService.executeTransaction(
            manager,
            platformBankWallet,
            WalletTransactionType.DEBIT,
            shopAmount,
            `کسر سهم فروشنده از صندوق بابت سفارش ${payment.orderId}`,
            payment.id
        );
        await this.walletService.executeTransaction(
            manager,
            shopWallet,
            WalletTransactionType.CREDIT,
            shopAmount,
            `سهم فروشنده از سفارش ${payment.orderId}`,
            payment.id
        );

        return await this.finalizePayment(manager, payment, 'WALLET', false, payment.id);
    }

    private async processCardPayment(manager: EntityManager, payment: Payment, userId: string, tenantId: string) {
        return await this.finalizePayment(manager, payment, 'CARD', false, payment.id);
    }

    private async processCodPayment(manager: EntityManager, payment: Payment, userId: string, tenantId: string) {
        return await this.finalizePayment(manager, payment, 'COD', false, payment.id);
    }

    async getPaymentStatus(paymentId: string, userId: string) {
        const tenantId = this.tenantContext.getTenantId();
        const payment = await this.paymentRepo.findOne({
            where: { id: paymentId, tenantId, userId },
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
                where: { id: paymentId, tenantId, userId, status: PaymentStatus.PENDING },
            } as any);

            if (!payment) {
                throw new NotFoundException(this.i18n.translate('payment.pending_payment_not_found'));
            }

            payment.status = PaymentStatus.CANCELED;
            await manager.save(payment);

            await manager.update(Order, { id: payment.orderId }, { status: OrderStatus.CUSTOMER_CANCELLED });

            return { success: true };
        });
    }

    async manualConfirmPayment(paymentId: string, userId: string, referenceId?: string) {
        return this.dataSource.transaction(async (manager) => {
            const payment = await manager.findOne(Payment, {
                where: { id: paymentId, status: PaymentStatus.PENDING },
            } as any);

            if (!payment) {
                throw new NotFoundException(this.i18n.translate('payment.not_found'));
            }

            payment.status = PaymentStatus.PAID;
            if (referenceId) {
                payment.metadata = { ...payment.metadata, referenceId };
            }
            await manager.save(payment);

            return await this.finalizePayment(manager, payment, 'MANUAL', false, referenceId);
        });
    }

    private async sendNotificationAndSms(
        manager: EntityManager,
        targetUserId: string,
        title: string,
        message: string,
        smsText: string,
        panelType: string
    ) {
        // Notification creation should ideally not block the main flow if it fails,
        // but for consistency, we keep it synchronous here.
        // In a microservices architecture, this would be an event.
        await this.notifService.create({
            userId: targetUserId,
            type: NotificationType.IN_APP,
            title,
            message,
            icon: 'shopping-bag',
            color: 'success',
            panelType,
        });

        const user = await manager.findOne(User, { where: { id: targetUserId } });
        if (user instanceof User && user.phoneNumber) {
            try {
                // Fire and forget for SMS to prevent blocking transaction if SMS service is down
                await this.smsQueue.add('handle-send-sms', {
                    phoneNumber: user.phoneNumber,
                    message: smsText,
                }, {
                    attempts: 3, // Retry 3 times
                    backoff: { type: 'exponential', delay: 2000 },
                });
            } catch (error) {
                // Log error but do not throw to avoid failing the order
                console.error(`Failed to enqueue SMS for user ${targetUserId}:`, error);
            }
        }
    }

    async finalizePayment(
        manager: EntityManager,
        payment: Payment,
        gatewayName: string,
        isRemainingPayment: boolean,
        refId?: string
    ): Promise<Transaction | null> {
        const order = await manager.findOne(Order, {
            where: { id: payment.orderId },
            relations: ['user', 'transaction'],
        } as any);

        if (!order) {
            throw new InternalServerErrorException(this.i18n.translate('payment.order_not_found'));
        }

        let transaction: Transaction | null = null;

        if (['WALLET', 'CARD', 'COD'].includes(gatewayName)) {
            transaction = manager.create(Transaction, {
                gateway: gatewayName,
                amount: payment.amount,
                status: TransactionStatus.SUCCESS,
                refId: refId || payment.id,
                metadata: {type: TransactionType.PHARMACY_ORDER},
                order: payment.orderId,
            } as any);
            await manager.save(transaction);
            order.transaction = transaction;
            await manager.save(order);
        }

        payment.status = PaymentStatus.PAID;
        payment.metadata= {...payment.metadata,referenceId:refId}

        if (isRemainingPayment) {
            payment.finalizedAt = new Date();
            await this.orderStateMachine.transitionOrder(
                payment.orderId,
                OrderStatus.TENANT_PROCESSING,
                manager,
                'VET-CLINIC-PHARMACY'
            );
        } else {
            await this.orderStateMachine.transitionOrder(
                payment.orderId,
                OrderStatus.CUSTOMER_PAID,
                manager,
                'VET-CLINIC-PHARMACY'
            );
        }

        await manager.save(payment);

        if (order) {
            // Notify Customer
            const customerNotifTitle = this.i18n.translate('payment.notif.success_title');
            const customerNotifMessage = await this.i18n.translate('payment.notif.success_message',{
                args:{
                    orderCode: String(order.orderCode)
                }
            });
            const customerSmsMessage = this.i18n.translate('payment.sms.success_sms',{
                args:{
                    orderCode:String(order.orderCode),
                    amount:String(payment.amount)
                }
            }) ;

            await this.sendNotificationAndSms(
                manager,
                order.userId,
                customerNotifTitle,
                customerNotifMessage,
                customerSmsMessage,
                'VET-CLINIC-PHARMACY'
            );

            // Notify Shop/Tenant
            const tenant = await manager.findOne(Tenant, {
                where: { id: order.tenantId },
                select: ['id', 'ownerUserId'],
            } as any);

            if (tenant && tenant.ownerUserId) {
                const shopOwnerNotifTitle = this.i18n.translate('payment.notif.new_order_paid_title');
                const shopOwnerNotifMessage = await this.i18n.translate('payment.notif.new_order_paid_message',{
                    args:{
                        orderCode:String(order.orderCode),
                        amount:String(payment.amount)
                    }
                });
                const shopOwnerSmsMessage = await this.i18n.translate('payment.notif.new_order_paid_sms',{
                    args:{
                        orderCode:String(order.orderCode),
                    }
                });

                await this.sendNotificationAndSms(
                    manager,
                    tenant.ownerUserId,
                    shopOwnerNotifTitle,
                    shopOwnerNotifMessage,
                    shopOwnerSmsMessage,
                    'PHARMACY-ADMIN'
                );
            }
        }

        return transaction;
    }

    async payRemainingAmountWithWallet(
        orderId: string,
        amount: number,
        tenantId: string,
        userId: string
    ) {
        return this.dataSource.transaction(async (manager) => {
            const order = await manager.findOne(Order, {
                where: { id: orderId, userId },
                relations: ['items', 'address', 'transaction'],
            } as any);

            if (!order) {
                throw new NotFoundException(this.i18n.translate('payment.order_not_found'));
            }
            if (order.tenantId !== tenantId) {
                throw new BadRequestException(this.i18n.translate('payment.tenant_mismatch'));
            }
            if (order.status !== OrderStatus.PENDING_REMAINING_PAYMENT) {
                throw new BadRequestException(this.i18n.translate('payment.order_already_paid'));
            }
            if (!order.transaction) {
                throw new NotFoundException(this.i18n.translate('payment.initial_transaction_not_found'));
            }

            const transaction = order.transaction;
            const metadata = order.metadata || {};
            const previousDeposit = Number(order.totalAmount) || 0;

            const expectedRemaining = Number(metadata.remainingAmount) || 0;

            if (amount < expectedRemaining) {
                throw new BadRequestException(
                    this.i18n.translate('payment.amount_less_than_remaining', { args: { amount: expectedRemaining } })
                );
            }

            const paymentId = `WALLET-REM-${Date.now()}`;

            const userWallet = await this.walletService.getWallet(undefined, userId, WalletType.USER, manager);
            const platformBankWallet = await this.walletService.getWallet(undefined, undefined, WalletType.PLATFORM_BANK, manager);
            const shopWallet = await this.walletService.getWallet(tenantId, undefined, WalletType.SHOP, manager);
            const petomanWallet = await this.walletService.getWallet(undefined, undefined, WalletType.PETOMAN, manager);

            if (Number(userWallet.balance) < amount) {
                throw new BadRequestException(this.i18n.translate('payment.insufficient_wallet_balance'));
            }

            const platformFeePercent = 5;
            const feeAmount = (amount * platformFeePercent) / 100;
            const shopNetAmount = amount - feeAmount;

            // 1. Debit User
            await this.walletService.executeTransaction(
                manager,
                userWallet,
                WalletTransactionType.DEBIT,
                amount,
                `پرداخت مانده سفارش شماره ${order.orderCode}`,
                paymentId
            );

            // 2. Credit Platform
            await this.walletService.executeTransaction(
                manager,
                platformBankWallet,
                WalletTransactionType.CREDIT,
                amount,
                `واریز مانده از کاربر به صندوق پلتفرم بابت سفارش ${order.orderCode}`,
                paymentId
            );

            // 3. Platform Fee (Petoman)
            await this.walletService.executeTransaction(
                manager,
                platformBankWallet,
                WalletTransactionType.DEBIT,
                feeAmount,
                `کسر سهم پلتفرم از مانده سفارش ${order.orderCode}`,
                paymentId
            );
            await this.walletService.executeTransaction(
                manager,
                petomanWallet,
                WalletTransactionType.CREDIT,
                feeAmount,
                `سهم پلتفرم از مانده سفارش ${order.orderCode}`,
                paymentId
            );

            // 4. Shop Amount
            await this.walletService.executeTransaction(
                manager,
                platformBankWallet,
                WalletTransactionType.DEBIT,
                shopNetAmount,
                `کسر سهم داروخانه از مانده سفارش ${order.orderCode}`,
                paymentId
            );
            await this.walletService.executeTransaction(
                manager,
                shopWallet,
                WalletTransactionType.CREDIT,
                shopNetAmount,
                `سهم داروخانه از مانده سفارش ${order.orderCode}`,
                paymentId
            );

            // Update Transaction
            transaction.status = TransactionStatus.SUCCESS;
            transaction.refId = paymentId;
            transaction.depositAmount = previousDeposit;
            transaction.remainingAmount = amount;
            transaction.amount = previousDeposit + amount;
            transaction.metadata = {
                ...transaction.metadata,
                type: TransactionType.PHARMACY_ORDER_FULLY_PAID,
                finalizedAt: new Date(),
            };
            await manager.save(transaction);

            // Update Order
            order.depositAmount = previousDeposit;
            order.remainingAmount = amount;
            order.totalAmount = previousDeposit + amount;
            order.metadata = {
                ...metadata,
                remainingAmount: 0,
                fullyPaidAt: new Date().toISOString(),
                lastPaymentMethod: 'wallet',
                lastPaymentRefId: paymentId,
            };
            await manager.save(order);

            // Update/Create Payment Record
            let payment = await manager.findOne(Payment, {
                where: { orderId: order.id },
            } as any);

            if (!payment) {
                payment = manager.create(Payment, {
                    orderId: order.id,
                    amount: amount,
                    tenantId: tenantId,
                    userId: userId,
                    status: PaymentStatus.PAID,
                    method: 'wallet',
                    metadata: {
                        referenceId: paymentId,
                        depositAmount: previousDeposit,
                        remainingPaid: amount,
                        finalizedAt: new Date(),
                    },
                });
            } else {
                payment.depositAmount=previousDeposit
                payment.remainingAmount=amount
                payment.amount += amount;
                payment.status = PaymentStatus.PAID;
                payment.metadata = {
                    ...payment.metadata,
                    depositAmount: previousDeposit,
                    remainingPaid: amount,
                    finalizedAt: new Date(),
                };
            }
            await manager.save(payment);

            // Transition Order Status
            await this.orderStateMachine.transitionOrder(
                order.id,
                OrderStatus.TENANT_PROCESSING,
                manager,
                'VET-CLINIC-PHARMACY'
            );

            // Notifications
            await this.sendNotificationAndSms(
                manager,
                userId,
                this.i18n.translate('payment.notification_remaining_paid_title'),
                `${this.i18n.translate('payment.notification_remaining_paid_message')} ${amount.toLocaleString('fa-IR')} ریال.`,
                this.i18n.translate('payment.notification_remaining_paid_sms'),
                'VET-CLINIC-PHARMACY'
            );

            const tenant = await manager.findOne(Tenant, {
                where: { id: tenantId },
                select: ['id', 'ownerUserId'],
            } as any);

            if (tenant?.ownerUserId) {
                await this.sendNotificationAndSms(
                    manager,
                    tenant.ownerUserId,
                    this.i18n.translate('payment.notification_remaining_paid_shop_title'),
                    this.i18n.translate('payment.notification_remaining_paid_shop_message'),
                    this.i18n.translate('payment.notification_remaining_paid_shop_sms'),
                    'PHARMACY-ADMIN'
                );
            }

            return {
                success: true,
                orderId: order.id,
                orderCode: order.orderCode,
                amount: amount,
                totalAmount: previousDeposit + amount,
                message: this.i18n.translate('payment.remaining_payment_success'),
            };
        });
    }

    private async calculateShippingCost(
        manager: EntityManager,
        payload: PharmacyOrderDto,
        tenantId: string
    ): Promise<number> {
        const tenant = await manager.findOne(Tenant, {
            where: { id: tenantId },
            relations: ['settings'],
        } as any);

        if (!tenant?.settings) {
            return 0; // یا خطا بدهید اگر تنظیمات اجباری است
        }

        const shippingSettings = (tenant as any).settings.find((s: any) => s.key === 'shipping_methods');

        if (!shippingSettings) {
            // اگر تنظیمات ارسال تعریف نشده باشد، صفر در نظر می‌گیریم یا خطا می‌دهیم
            return 0;
        }

        const methods = shippingSettings.value?.methods;
        if (!methods) {
            return 0;
        }

        const selectedMethod = methods.find((m: any) => m.type === payload.shippingMethod);

        if (!selectedMethod || !selectedMethod.isActive) {
            // اگر روش انتخاب شده فعال نیست، ممکن است بخواهید خطا بدهید یا پیش‌فرض را انتخاب کنید
            // اینجا فرض می‌کنیم اگر فعال نیست، هزینه ندارد یا خطا می‌دهد.
            // برای ایمنی:
            if (payload.shippingMethod === 'inPerson') {
                return 0;
            }
            throw new BadRequestException(this.i18n.translate('error.invalid_shipping_method'));
        }

        if (payload.shippingMethod === 'inPerson') {
            return 0;
        }

        return Number(selectedMethod.price) || 0;
    }
}