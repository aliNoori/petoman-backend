import {BadRequestException, Injectable, InternalServerErrorException, NotFoundException} from '@nestjs/common';
import {DataSource, EntityManager} from 'typeorm';
import {ProductOrderItem} from './product-order-item.entity';
import {TenantContext} from "../../../tenants/tenant-context.service";
import {OrderType} from "../../../shared/order/order-type.enum";
import {getStatusText, OrderStatus} from "../../../shared/order/order-status.enum";
import {Order} from "../../../shared/order/order.entity";
import {SubmitOrderDto} from "../../../shared/order/submit-order.dto"; // DTO جدیدی که ساختیم
import {ListOrdersQuery} from "../../../shared/order/list-orders.query";
import {WalletService} from "../../../shared/wallet/wallet.service";
import {WalletType} from "../../../shared/wallet/wallet.entity";
import {OrderStateMachineService} from "../payment/order-state-machine.service";
import {ProductVariant} from "../product/entities/product-variant.entity";
import {MarketProduct} from "../product/entities/product.entity";
import {Payment} from "../../../shared/gateways/payments/payment.entity";
import {PaymentStatus} from "../../../shared/gateways/payments/payment-status-machine.enum";
import {WalletTransaction, WalletTransactionType} from "../../../shared/wallet/wallet-transaction.entity";
import {TransactionStatus,Transaction} from "../../../shared/transaction/transaction.entity";
import {I18nService} from "nestjs-i18n";

@Injectable()
export class MarketOrderService {
    constructor(
        private readonly i18n: I18nService,
        private readonly dataSource: DataSource,
        private readonly tenantContext: TenantContext,
        private readonly walletService: WalletService,
        private readonly orderStateMachine:OrderStateMachineService
    ) {
    }

    /**
     * Submit order directly from frontend data
     * Handles Wallet payment immediately or returns payment link for Online
     */
    async submitOrder(dto: SubmitOrderDto, userId: string) {
        const tenantId = this.tenantContext.getTenantId();

        return this.dataSource.transaction(async (manager) => {
            // 1️⃣ Validate Products & Calculate Total Price
            let itemsTotal = 0;
            const itemsToCreate = dto.items.map(item => {
                // در محیط واقعی باید قیمت محصول را از دیتابیس بخوانید
                // اینجا برای سادگی از قیمت ارسالی فرانت (اگر وجود دارد) یا قیمت ثابت استفاده می‌کنیم
                const unitPrice = item.price || 0;
                const itemTotal = unitPrice * item.quantity;
                itemsTotal += itemTotal;

                return manager.create(ProductOrderItem, {
                    productId: item.id,
                    quantity: item.quantity,
                    price: unitPrice,
                    // orderId بعدا ست می‌شود
                });
            });

            // 2️⃣ Calculate Shipping Cost
            // فرض: هزینه ارسال تایم اسلات یا روش ارسال است
            const shippingCost = dto.deliveryTimeSlot.price || 0;
            const finalTotalAmount = itemsTotal + shippingCost;

            // 3️⃣ Verify Total Amount (Security Check)
            if (Math.abs(finalTotalAmount - dto.totalAmount) > 100) { // اختلاف جزئی قابل چشم‌پوشی
                throw new BadRequestException('Price mismatch. Please refresh the page.');
            }

            // 4️⃣ Create Order
            const order = manager.create(Order, {
                tenantId,
                userId,
                type: OrderType.PRODUCT,
                status: OrderStatus.PENDING_PAYMENT, // وضعیت اولیه: در انتظار پرداخت
                totalAmount: finalTotalAmount,
                note: dto.notes,
                // ذخیره اطلاعات اضافی در متادیتا یا فیلدهای جداگانه اگر وجود داشته باشد
                metadata: {
                    addressId: dto.addressId,
                    deliveryDate: dto.deliveryDate.date,
                    deliveryTimeSlot: dto.deliveryTimeSlot.time,
                    shippingMethod: dto.shippingMethod,
                    sellerId: dto.sellerId,
                }
            });

            const savedOrder = await manager.save(order);

            // 5️⃣ Save Items
            itemsToCreate.forEach(item => item.orderId = savedOrder.id);
            await manager.save(itemsToCreate);

            // 6️⃣ Handle Payment Method
            if (dto.paymentMethod === 'wallet') {
                try {
                    // کسر مبلغ از کیف پول کاربر
                    await this.walletService.debit(
                        tenantId,
                        userId,
                        WalletType.USER,
                        finalTotalAmount,
                        `Payment for order ${savedOrder.id}`,
                        savedOrder.id // Reference ID
                    );

                    // اگر پرداخت موفق بود، وضعیت سفارش را تغییر بده
                    savedOrder.status = OrderStatus.CUSTOMER_PAID; // یا PENDING بسته به فلو شما
                    // معمولاً بعد از پرداخت، سفارش در وضعیت PAID یا PENDING (برای تایید فروشگاه) قرار می‌گیرد
                    savedOrder.status = OrderStatus.CUSTOMER_PENDING;
                    await manager.save(savedOrder);

                    return {
                        orderId: savedOrder.id,
                        status: savedOrder.status,
                        paymentMethod: 'wallet',
                        message: 'Order paid successfully with wallet.'
                    };

                } catch (error) {
                    // اگر موجودی کم بود، سفارش را کنسل کن یا خطا بده
                    savedOrder.status = OrderStatus.PAYMENT_FAILED;
                    await manager.save(savedOrder);
                    throw new BadRequestException('Insufficient wallet balance.');
                }

            } else if (dto.paymentMethod === 'online') {
                // شبیه‌سازی ایجاد تراکنش آنلاین
                // در واقعیت اینجا با درگاه بانکی صحبت می‌کنید
                const paymentUrl = `https://gateway.example.com/pay/${savedOrder.id}`;

                return {
                    orderId: savedOrder.id,
                    status: OrderStatus.PENDING_PAYMENT,
                    paymentMethod: 'online',
                    paymentUrl, // لینک پرداخت برای ریدایرکت کاربر
                    message: 'Redirect to payment gateway.'
                };

            } else {
                // Cash on Delivery
                savedOrder.status = OrderStatus.CUSTOMER_PENDING; // سفارش ثبت شد، منتظر تایید فروشگاه
                await manager.save(savedOrder);

                return {
                    orderId: savedOrder.id,
                    status: savedOrder.status,
                    paymentMethod: 'cash',
                    message: 'Order placed successfully.'
                };
            }
        });
    }

    /**
     * Get order details with items (User View)
     */
    async getOrderById(orderId: string, userId: string) {
        const tenantId = this.tenantContext.getTenantId();
        const order = await this.dataSource.getRepository(Order).findOne({
            where: {
                id: orderId,
                tenantId,
                userId,
                type: OrderType.PRODUCT,
            },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        const items = await this.dataSource
            .getRepository(ProductOrderItem)
            .find({
                where: {orderId: order.id},
            });

        return {
            id: order.id,
            type: order.type,
            status: order.status,
            totalAmount: order.totalAmount,
            note: order.note,
            metadata: order.metadata, // شامل آدرس و زمان ارسال
            createdAt: order.createdAt,
            items: items.map((item) => ({
                productId: item.productId,
                price: item.price,
                quantity: item.quantity,
            })),
        };
    }

    /**
     * List user's product orders with pagination
     */
    async listOrders(query: ListOrdersQuery, userId: string) {
        const tenantId = this.tenantContext.getTenantId();
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const skip = (page - 1) * limit;

        const qb = this.dataSource
            .getRepository(Order)
            .createQueryBuilder('order')
            .where('order.tenantId = :tenantId', {tenantId})
            .andWhere('order.userId = :userId', {userId})
            .andWhere('order.type = :type', {type: OrderType.PRODUCT});

        if (query.status) {
            qb.andWhere('order.status = :status', {status: query.status});
        }

        const [orders, total] = await qb
            .orderBy('order.createdAt', 'DESC')
            .skip(skip)
            .take(limit)
            .getManyAndCount();

        return {
            page,
            limit,
            total,
            data: orders.map((order) => ({
                id: order.id,
                status: order.status,
                totalAmount: order.totalAmount,
                createdAt: order.createdAt,
            })),
        };
    }

    /**
     * List orders for the Shop (Tenant Admin)
     */
    async listShopOrders(query: ListOrdersQuery) {
        const tenantId = this.tenantContext.getTenantId();
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const skip = (page - 1) * limit;

        const qb = this.dataSource
            .getRepository(Order)
            .createQueryBuilder('order')
            .leftJoinAndSelect('order.user', 'user')
            .leftJoinAndSelect('order.address', 'address')
            .leftJoinAndSelect('order.items', 'items')
            .leftJoinAndSelect('items.marketProduct', 'marketProduct')
            .leftJoinAndSelect('marketProduct.product', 'product')
            .where('order.tenantId = :tenantId', {tenantId})
            .andWhere('order.type = :type', {type: OrderType.PRODUCT})
        ;

        if (query.status) {
            qb.andWhere('order.status = :status', {status: query.status});
        }

        const [orders, total] = await qb
            .orderBy('order.createdAt', 'DESC')
            .skip(skip)
            .take(limit)
            .getManyAndCount();

        return {
            page,
            limit,
            total,
            data: orders.map((order) => ({
                id: order.id,
                orderCode:order.orderCode,
                userId: order.userId,
                status: order.status,
                totalAmount: order.totalAmount,
                metadata:order.metadata,
                note: order.note,
                user:order.user,
                items:order.items,
                address:order.address,
                createdAt: order.createdAt,
            })),
        };
    }
    /**
     * Confirm a pending order (Shop Action)
     */
    async confirmOrder(orderId: string) {
        return this.dataSource.transaction(async (manager) => {
            const tenantId = this.tenantContext.getTenantId();
            const order = await manager.findOne(Order, {
                where: {
                    id: orderId,
                    tenantId,
                    type: OrderType.PRODUCT,
                    status: OrderStatus.CUSTOMER_PAID, // فقط سفارشات تایید شده توسط سیستم (پرداخت شده)
                },
            } as any);

            if (!order) {
                throw new NotFoundException('customer paid order not found');
            }

            order.status = OrderStatus.TENANT_PROCESSING;
            await manager.save(order);

            return {
                orderId: order.id,
                status: order.status,
            };
        });
    }

    /**
     * Reject a pending order (Shop Action)
     */
    async rejectOrder(orderId: string, reason?: string) {
        return this.dataSource.transaction(async (manager) => {
            const tenantId = this.tenantContext.getTenantId();
            const order = await manager.findOne(Order, {
                where: {
                    id: orderId,
                    tenantId,
                    type: OrderType.PRODUCT,
                    status: OrderStatus.CUSTOMER_PENDING,
                },
            } as any);

            if (!order) {
                throw new NotFoundException('Pending order not found');
            }

            order.status = OrderStatus.REJECTED;
            if (reason) order.note = (order.note || '') + ` [Rejection: ${reason}]`;

            // منطق بازگشت پول (Refund) باید اینجا اضافه شود
            // await this.walletService.credit(...)

            await manager.save(order);

            return {
                orderId: order.id,
                status: order.status,
            };
        });
    }

    /**
     * Generic method to update order status.
     * This method utilizes the OrderStateMachine service to validate and apply the status transition.
     *
     * @param orderId - The unique identifier of the order to be updated.
     * @param newStatus - The target status to transition the order to.
     * @returns An object containing the updated order ID and its new status.
     * @throws {NotFoundException} If the specified order does not exist.
     * @throws {BadRequestException} If the status transition is invalid according to the state machine rules.
     */
    async updateOrderStatus(orderId: string, newStatus: OrderStatus) {
        return this.dataSource.transaction(async (manager: EntityManager) => {
            // Retrieve tenant ID if multi-tenancy is implemented
            const tenantId = this.tenantContext.getTenantId();

            // Fetch the order to ensure it exists within the current transaction context.
            // Note: While the state machine also performs a check, doing it here allows for specific tenant/type filtering if needed.
            const order = await manager.findOne(Order, {
                where: {
                    id: orderId,
                    tenantId,
                    // type: OrderType.PRODUCT,
                },
                relations: ['items', 'items.marketProduct', 'items.variant', 'items.pharmacyMedicine', 'payment', 'transaction']
            } as any);

            if (!order) {
                throw new NotFoundException('Order not found');
            }

            if (newStatus === OrderStatus.TENANT_CANCELLED) {
                // Tenant initiated rejection
                const userId = order.userId;
                try {
                    await this.cancelOrder(orderId, userId, true);

                    const updatedOrder = await manager.findOne(Order, {
                        where: {id: orderId},
                        relations: ['items', 'items.marketProduct', 'items.variant', 'items.pharmacyMedicine', 'payment', 'transaction']
                    } as any);

                    return {
                        orderId: updatedOrder?.id,
                        status: updatedOrder?.status,
                    };
                } catch (error) {
                    throw error;
                }
            }

            // Delegate the status transition logic to the OrderStateMachine service.
            // This ensures that all business rules regarding valid transitions are enforced.
            // The transaction manager is passed to ensure atomicity.
            const updatedOrder = await this.orderStateMachine.transitionOrder(
                orderId,
                newStatus,
                manager,'MARKET'
            );

            // Return the confirmation of the update
            return {
                orderId: updatedOrder.id,
                status: updatedOrder.status,
                message:await this.i18n.t('order.status_update_success',{args:{newStatus:getStatusText(updatedOrder.status)}})
            };
        });
    }

    /**
     * Cancel a pending product order (User Action or Tenant Rejection)
     * This method now includes full refund and inventory restoration logic.
     */
    async cancelOrder(orderId: string, userId: string, isTenantAction: boolean = false) {
        return this.dataSource.transaction(async (manager) => {
            const tenantId = this.tenantContext.getTenantId();

            // 1️⃣ پیدا کردن سفارش و اطمینان از مالکیت (اگر توسط یوزر است) یا دسترسی تنت
            const order = await manager.findOne(Order, {
                where: {
                    id: orderId,
                    tenantId,
                    // اگر توسط یوزر است، userId را هم چک کن
                    ...(isTenantAction ? {} : {userId}),
                    type: OrderType.PRODUCT,
                },
                relations: ['items', 'items.marketProduct', 'items.variant', 'items.pharmacyMedicine', 'transaction', 'payment'],
            } as any);

            if (!order) {
                throw new NotFoundException(await this.i18n.t('order.not_found'));
            }

            // جلوگیری از لغو سفارشات تحویل داده شده
            if (([
                //OrderStatus.TENANT_PROCESSING,
                OrderStatus.TENANT_SHIPPED,
                OrderStatus.CUSTOMER_DELIVERED,
                OrderStatus.CUSTOMER_REFUNDED
            ] as OrderStatus[]).includes(order.status)) {
                throw new BadRequestException(await this.i18n.t('order.invalid_status'));
            }

            // =========================================================
            // ✅ بخش ۱: بازگرداندن موجودی محصولات و ورینت‌ها
            // =========================================================
            if (order.items && order.items.length > 0) {
                for (const item of order.items) {
                    if (item.variant) {
                        const variant = await manager.findOne(ProductVariant, {
                            where: {id: item.variant.id}
                        } as any);
                        if (variant) {
                            variant.stock += item.quantity;
                            await manager.save(variant);
                        }
                    } else if (item.marketProduct) {
                        const product = await manager.findOne(MarketProduct, {
                            where: {id: item.productId}
                        } as any);
                        if (product) {
                            product.stock += item.quantity;
                            await manager.save(product);
                        }
                    }
                }
            }
            // =========================================================
            // پایان بخش بازگرداندن موجودی
            // =========================================================

            // 2️⃣ پیدا کردن رکورد پرداخت
            const payment = await manager.findOne(Payment, {
                where: {orderId: order.id},
            } as any);

            if (!payment) {
                throw new NotFoundException(await this.i18n.t('payment.not_found'));
            }

            if (payment.status === PaymentStatus.REFUNDED || payment.status === PaymentStatus.CANCELED) {
                throw new BadRequestException(await this.i18n.t('payment.already_refunded'));
            }

            // 3️⃣ تغییر وضعیت سفارش به لغو شده (FSM)
            try {
                // اگر توسط تنت رد می‌شود، وضعیت ممکن است REJECTED باشد، اگر توسط یوزر لغو می‌شود CUSTOMER_CANCELLED
                const targetStatus = isTenantAction ? OrderStatus.TENANT_CANCELLED : OrderStatus.CUSTOMER_CANCELLED;

                await this.orderStateMachine.transitionOrder(
                    orderId,
                    targetStatus,
                    manager,
                    'MARKET',
                    isTenantAction ? tenantId : userId // userId برای لاگ‌ها
                );
            } catch (error) {
                throw new BadRequestException(await this.i18n.t('order.status_update_failed',{args:{message:error.message}}));
            }

            // 4️⃣ تشخیص وضعیت تسویه و مدیریت تراکنش‌های Pending
            const pendingCreditTx = await manager.findOne(WalletTransaction, {
                where: {referenceId: payment.id, type: WalletTransactionType.PENDING_CREDIT}
            } as any);
            const pendingFeeTx = await manager.findOne(WalletTransaction, {
                where: {referenceId: payment.id, type: WalletTransactionType.PENDING_FEE}
            } as any);

            // اگر تراکنش‌های پندینگ وجود دارند، آن‌ها را لغو کن
            if (pendingCreditTx) {
                pendingCreditTx.metadata = {
                    ...pendingCreditTx.metadata,
                    cancelled: true,
                    cancelledAt: new Date()
                };
                await manager.save(WalletTransaction, pendingCreditTx);

                // ایجاد تراکنش لغو برای خنثی‌سازی در جاب شبانه
                const cancelCreditTx = manager.create(WalletTransaction, {
                    walletId: (pendingCreditTx as WalletTransaction).walletId,
                    type: WalletTransactionType.CANCEL_CREDIT,
                    amount: (pendingCreditTx as WalletTransaction).amount,
                    balanceAfter: Number((pendingCreditTx as WalletTransaction).balanceAfter),
                    description: `Cancel pending credit for order #${order.id}`,
                    referenceId: order.id,
                    metadata: {...(pendingCreditTx as WalletTransaction).metadata, cancelledByRefund: true}
                });
                await manager.save(WalletTransaction, cancelCreditTx);
            }

            if (pendingFeeTx) {
                pendingFeeTx.metadata = {
                    ...pendingFeeTx.metadata,
                    cancelled: true,
                    cancelledAt: new Date()
                };
                await manager.save(WalletTransaction, pendingFeeTx);

                const cancelFeeTx = manager.create(WalletTransaction, {
                    walletId: (pendingFeeTx as WalletTransaction).walletId,
                    type: WalletTransactionType.CANCEL_FEE,
                    amount: (pendingFeeTx as WalletTransaction).amount,
                    balanceAfter: Number((pendingFeeTx as WalletTransaction).balanceAfter),
                    description: `Cancel pending fee for order #${order.id}`,
                    referenceId: order.id,
                    metadata: {...(pendingFeeTx as WalletTransaction).metadata, cancelledByRefund: true}
                });
                await manager.save(WalletTransaction, cancelFeeTx);
            }

            const refundAmount = Number(payment.amount);
            const userWallet = await this.walletService.getWallet(
                undefined,
                userId,
                WalletType.USER,
                manager
            );

            const isSettled = !pendingCreditTx && !pendingFeeTx;

            if (isSettled) {
                // ---------------------------------------------------------
                // حالت ۲: تسویه انجام شده است (پول بین فروشنده و پلتفرم تقسیم شده)
                // باید از کیف پول فروشنده و پلتفرم برداشت کنیم.
                // ---------------------------------------------------------

                // 1. برداشت از کیف پول فروشنده (Shop Wallet)
                const shopWallet = await this.walletService.getWallet(
                    order.tenantId,
                    undefined,
                    WalletType.SHOP,
                    manager
                );
                if (!shopWallet) {
                    throw new InternalServerErrorException(await this.i18n.t('wallet.not_found'));
                }
                const platformFeePercent = 5; // فرض: 5 درصد کمیسیون
                const platformRefundAmount = (refundAmount * platformFeePercent) / 100;
                const shopRefundAmount = refundAmount - platformRefundAmount;

                if (Number(shopWallet.balance) < shopRefundAmount) {
                    throw new BadRequestException(await this.i18n.t('wallet.shop_insufficient',{args:{amount:shopRefundAmount}}));
                }
                await this.walletService.executeTransaction(
                    manager,
                    shopWallet,
                    WalletTransactionType.REFUND_OUT,
                    shopRefundAmount,
                    `Refund for canceled order #${order.id} - Shop Share`,
                    order.id
                );

                // 2. برداشت از کیف پول پلتفرم (Petoman Wallet)
                const petomanWallet = await this.walletService.getWallet(
                    undefined,
                    undefined,
                    WalletType.PETOMAN,
                    manager
                );
                if (!petomanWallet) {
                    throw new InternalServerErrorException(await this.i18n.t('wallet.platform_not_found'));
                }
                if (Number(petomanWallet.balance) < platformRefundAmount) {
                    throw new BadRequestException(await this.i18n.t('wallet.platform_insufficient'));
                }
                await this.walletService.executeTransaction(
                    manager,
                    petomanWallet,
                    WalletTransactionType.REFUND_OUT,
                    platformRefundAmount,
                    `Refund for canceled order #${order.id} - Platform Fee`,
                    order.id
                );

                // 3. واریز به کیف پول کاربر (کل مبلغ)
                await this.walletService.executeTransaction(
                    manager,
                    userWallet,
                    WalletTransactionType.REFUND_IN,
                    refundAmount,
                    `Refund for canceled order #${order.id}`,
                    order.id
                );
            } else {
                // ---------------------------------------------------------
                // حالت ۱: تسویه انجام نشده است (تراکنش‌های Pending وجود دارند)
                // پول هنوز در صندوق پلتفرم است.
                // ---------------------------------------------------------

                const platformBankWallet = await this.walletService.getWallet(
                    undefined,
                    undefined,
                    WalletType.PLATFORM_BANK,
                    manager
                );
                if (!platformBankWallet) {
                    throw new InternalServerErrorException(await this.i18n.t('wallet.platform_insufficient'));
                }
                if (Number(platformBankWallet.balance) < refundAmount) {
                    throw new InternalServerErrorException(await this.i18n.t('wallet.bank_insufficient'));
                }

                // واریز کل مبلغ به کاربر از صندوق پلتفرم
                await this.walletService.executeTransaction(
                    manager,
                    platformBankWallet,
                    WalletTransactionType.REFUND_OUT,
                    refundAmount,
                    `Refund for canceled order #${order.id} (From Platform Bank - Pending Cancelled)`,
                    order.id
                );
                await this.walletService.executeTransaction(
                    manager,
                    userWallet,
                    WalletTransactionType.REFUND_IN,
                    refundAmount,
                    `Refund for canceled order #${order.id}`,
                    order.id
                );
            }

            // 5️⃣ به‌روزرسانی وضعیت پرداخت
            payment.status = PaymentStatus.REFUNDED;
            payment.refundedAt = new Date();
            await manager.save(payment);

            if (order.transaction) {
                order.transaction.status = TransactionStatus.REFUNDED;
                await manager.save(Transaction, order.transaction);
            }

            return {
                success: true,
                message: 'Order canceled successfully. Amount refunded to your wallet.',
                orderId: order.id,
                refundedAmount: refundAmount,
                newWalletBalance: Number(userWallet.balance)
            };
        });
    }

}