import {BadRequestException, Injectable, InternalServerErrorException, NotFoundException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {DataSource, Repository} from 'typeorm';
import {Order} from "../../../../shared/order/order.entity";
import {ProductOrderItem} from "../../order/product-order-item.entity";
import {OrderStatus} from "../../../../shared/order/order-status.enum";
import {Payment} from "../../../../shared/gateways/payments/payment.entity";
import {PaymentStatus} from "../../../../shared/gateways/payments/payment-status-machine.enum";
import {OrderStateMachineService} from "../../payment/order-state-machine.service";
import {WalletService} from "../../../../shared/wallet/wallet.service";
import {WalletType} from "../../../../shared/wallet/wallet.entity";
import {WalletTransaction, WalletTransactionType} from "../../../../shared/wallet/wallet-transaction.entity";
import {MarketProduct} from "../../product/entities/product.entity";
import {ProductVariant} from "../../product/entities/product-variant.entity";
import {Transaction, TransactionStatus} from "../../../../shared/transaction/transaction.entity";

@Injectable()
export class UserOrderService {
    constructor(
        private readonly dataSource: DataSource,
        @InjectRepository(Order)
        private orderRepository: Repository<Order>,
        @InjectRepository(ProductOrderItem)
        private itemRepository: Repository<ProductOrderItem>,
        @InjectRepository(MarketProduct)
        private readonly productRepo: Repository<MarketProduct>,
        private readonly orderStateMachine: OrderStateMachineService,
        private readonly walletService: WalletService,
    ) {
    }

    async getUserOrders(userId: string, orderType?: string[]): Promise<Order[]> {

        const queryBuilder = this.orderRepository
            .createQueryBuilder('order')
            // فیلتر کردن کاربر
            .where('order.userId = :userId', {userId})
            // لود کردن آیتم‌ها
            .leftJoinAndSelect('order.tenant', 'seller')
            // لود کردن آیتم‌ها
            .leftJoinAndSelect('order.address', 'address')
            // لود کردن آیتم‌ها
            .leftJoinAndSelect('order.items', 'item')
            // لود کردن محصول اصلی
            .leftJoinAndSelect('item.marketProduct', 'marketProduct')
            .leftJoinAndSelect('marketProduct.product', 'product')
            // لود کردن محصول اصلی
            .leftJoinAndSelect('item.pharmacyMedicine', 'pharmacyMedicine')
            .leftJoinAndSelect('pharmacyMedicine.medicine', 'medicine')
            // لود کردن نظرات محصول اصلی با فیلتر کاربر
            // نکته: نام پارامتر را به currentUserId تغییر دادم تا با userId اصلی تداخل نداشته باشد
            .leftJoinAndSelect('marketProduct.reviews', 'productReview', 'productReview.userId = :currentUserId',
                {currentUserId: userId})
            // لود کردن ورینت
            .leftJoinAndSelect('item.variant', 'variant')
            // لود کردن نظرات ورینت با فیلتر کاربر
            .leftJoinAndSelect('variant.reviews', 'variantReview', 'variantReview.userId = :currentUserId',
                {currentUserId: userId})
            // لود کردن سایر روابط
            .leftJoinAndSelect('order.payment', 'payment')
            .leftJoinAndSelect('order.review', 'review')
            .leftJoinAndSelect('order.transaction', 'transaction');

        // --- اضافه کردن فیلتر orderType ---
        if (orderType && orderType.length > 0) {
            queryBuilder.andWhere('order.type IN (:...types)', {types: orderType});
        }

        return queryBuilder.getMany();
    }

    /**
     * به‌روزرسانی اطلاعات پست در متادیتای سفارش
     * این متد توسط کنترلر الوپیک فراخوانی می‌شود
     */
    async updateShipmentInfo(
        orderId: string,
        shipmentData: {
            alopeykOrderId?: string;
            trackingCode?: string;
            [key: string]: any;
        }
    ): Promise<Order> {
        const order = await this.orderRepository.findOne({
            where: {id: orderId}
        });

        if (!order) {
            throw new NotFoundException(`سفارش با شناسه ${orderId} یافت نشد`);
        }

        // اطمینان از وجود آبجکت metadata
        if (!order.metadata) {
            order.metadata = {};
        }

        if (order.status === OrderStatus.TENANT_SHIPPED) {

            try {
                await this.orderStateMachine.transitionOrder(
                    orderId,
                    OrderStatus.TENANT_PROCESSING,
                );
            } catch (error) {
                throw new BadRequestException(`Failed to update order status: ${error.message}`);
            }
        }

        // ادغام اطلاعات جدید با متادیتای موجود
        // استفاده از Object.assign برای حفظ سایر اطلاعات متادیتا
        /*Object.assign(order.metadata, {
            alopeykOrderId: shipmentData.alopeykOrderId,
            trackingCode: shipmentData.trackingCode,
            updatedAt: new Date()
        });*/

        Object.assign(order.metadata, shipmentData, {
            updatedAt: new Date()
        });
        // ذخیره تغییرات در دیتابیس
        return await this.orderRepository.save(order);
    }

    async getOrderById(orderId: string, userId: string): Promise<Order> {
        const order = await this.orderRepository.findOne({
            where: {id: orderId, userId},
            relations: ['items', 'payment', 'transaction', 'address','tenant.tenantAddress']
        })

        if (!order) {
            throw new NotFoundException('سفارش مورد نظر یافت نشد');
        }

        order.items = await this.itemRepository.find({
            where: {orderId: order.id},
            relations: ['marketProduct.product',
                'pharmacyMedicine.medicine',
                'variant.marketProduct.product']
        });

        return order;
    }

    async getOrderByTenantId(orderId: string, tenantId: string): Promise<Order> {
        const order = await this.orderRepository.findOne({
            where: {id: orderId, tenantId},
            relations: ['items', 'payment', 'transaction', 'address','tenant.tenantAddress']
        })

        if (!order) {
            throw new NotFoundException('سفارش مورد نظر یافت نشد');
        }

        order.items = await this.itemRepository.find({
            where: {orderId: order.id},
            relations: ['marketProduct.product',
                'pharmacyMedicine.medicine',
                'variant.marketProduct.product']
        });

        return order;
    }

    /**
     * لغو سفارش توسط کاربر و بازگشت وجه به کیف پول کاربر
     * منبع بازگشت: بستگی به وضعیت تسویه دارد (Platform Bank یا Shop/Petoman)
     * مقصد بازگشت: کیف پول کاربر (User Wallet)
     */
    async cancelOrderByUser(orderId: string, userId: string): Promise<any> {
        return this.orderRepository.manager.transaction(async (manager) => {

            // 1️⃣ پیدا کردن سفارش و اطمینان از مالکیت
            const order = await manager.findOne(Order, {
                where: {id: orderId, userId},
                relations: ['items', 'items.marketProduct', 'items.variant','transaction']
            } as any);
            if (!order) {
                throw new NotFoundException('Order not found or unauthorized.');
            }

            // جلوگیری از لغو سفارشات تحویل داده شده
            // مثال در سرویس OrderService
            if (([OrderStatus.TENANT_PROCESSING, OrderStatus.TENANT_SHIPPED, OrderStatus.CUSTOMER_DELIVERED, OrderStatus.CUSTOMER_REFUNDED] as OrderStatus[]).includes(order.status)) {
                throw new BadRequestException('سفارش در وضعیت کنونی قابل لغو نیست. لطفاً از فرآیند مرجوعی استفاده کنید.');
            }

            // =========================================================
            // ✅ تغییر جدید: بازگرداندن موجودی محصولات و ورینت‌ها
            // =========================================================
            if (order.items && order.items.length > 0) {
                for (const item of order.items) {
                    // اگر آیتم ورینت دارد، موجودی ورینت را برگردان
                    if (item.variant) {
                        // لود کردن ورینت اگر در رابطه بالا لود نشده باشد (برای اطمینان)
                        const variant = await manager.findOne(ProductVariant, {
                            where: {id: item.variant.id}
                        } as any);

                        if (variant) {
                            variant.stock += item.quantity;
                            await manager.save(variant);
                        }
                    }
                    // اگر ورینت ندارد، موجودی محصول اصلی را برگردان
                    else if (item.marketProduct) {
                        // لود کردن محصول اگر در رابطه بالا لود نشده باشد
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
                throw new NotFoundException('Payment record not found.');
            }

            if (payment.status === PaymentStatus.REFUNDED || payment.status === PaymentStatus.CANCELED) {
                throw new BadRequestException('This payment has already been refunded.');
            }

            // 3️⃣ تغییر وضعیت سفارش به لغو شده (FSM)
            try {
                await this.orderStateMachine.transitionOrder(
                    orderId,
                    OrderStatus.CUSTOMER_CANCELLED,
                    manager,
                    'MARKET',
                    userId
                );
            } catch (error) {
                throw new BadRequestException(`Failed to update order status: ${error.message}`);
            }

            // 4️⃣ تشخیص وضعیت تسویه و مدیریت تراکنش‌های Pending
            const pendingCreditTx = await manager.findOne(WalletTransaction, {
                where: {referenceId: payment.id, type: WalletTransactionType.PENDING_CREDIT}
            } as any);

            const pendingFeeTx = await manager.findOne(WalletTransaction, {
                where: {referenceId: payment.id, type: WalletTransactionType.PENDING_FEE}
            } as any);

            if (pendingCreditTx) {
                pendingCreditTx.metadata = {
                    ...pendingCreditTx.metadata,
                    cancelled: true,
                    cancelledAt: new Date()
                };
                await manager.save(WalletTransaction, pendingCreditTx);
            }
            if (pendingFeeTx) {
                pendingFeeTx.metadata = {
                    ...pendingFeeTx.metadata,
                    cancelled: true,
                    cancelledAt: new Date()
                };
                await manager.save(WalletTransaction, pendingFeeTx);
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
                // حالت ۲: تسویه انجام شده است (تراکنش‌های Pending وجود ندارند)
                // پول بین فروشنده و پلتفرم تقسیم شده است.
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
                    throw new InternalServerErrorException('Shop wallet not found.');
                }

                const platformFeePercent = 5;
                const platformRefundAmount = (refundAmount * platformFeePercent) / 100;
                const shopRefundAmount = refundAmount - platformRefundAmount; // فرض: کل مبلغ به کاربر برگشت داده می‌شود

                if (Number(shopWallet.balance) < shopRefundAmount) {
                    throw new BadRequestException(`Insufficient balance in shop wallet for refund. Shop needs to cover ${shopRefundAmount}.`);
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
                    throw new InternalServerErrorException('Petoman wallet not found.');
                }

                if (Number(petomanWallet.balance) < platformRefundAmount) {
                    throw new BadRequestException(`Insufficient balance in Petoman wallet for refund.`);
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
                // باید تراکنش‌های Pending را لغو کنیم تا جاب شبانه آن‌ها را پردازش نکند.
                // ---------------------------------------------------------

                // پیدا کردن کیف پول صندوق پلتفرم
                const platformBankWallet = await this.walletService.getWallet(
                    undefined,
                    undefined,
                    WalletType.PLATFORM_BANK,
                    manager
                );
                if (!platformBankWallet) {
                    throw new InternalServerErrorException('Platform bank wallet not found.');
                }

                // اعتبارسنجی موجودی صندوق
                if (Number(platformBankWallet.balance) < refundAmount) {
                    throw new InternalServerErrorException('Insufficient funds in platform bank for refund.');
                }

                // لغو تراکنش پندینگ Credit (سهم فروشنده)
                if (pendingCreditTx) {
                    // ایجاد تراکنش معکوس برای خنثی کردن پندینگ
                    // فرض: نوع CANCEL_CREDIT باعث می‌شود جاب شبانه این تراکنش را نادیده بگیرد
                    const cancelCreditTx = manager.create(WalletTransaction, {
                        walletId: (pendingCreditTx as WalletTransaction).walletId, // کیف پول فروشنده
                        type: WalletTransactionType.CANCEL_CREDIT, // تایپ جدید برای لغو
                        amount: (pendingCreditTx as WalletTransaction).amount,
                        balanceAfter: Number((pendingCreditTx as WalletTransaction).balanceAfter), // موجودی تغییر نمی‌کند چون هنوز واریز نشده
                        description: `Cancel pending credit for order #${order.id}`,
                        referenceId: order.id,
                        metadata: {...(pendingCreditTx as WalletTransaction).metadata, cancelledByRefund: true}
                    });
                    await manager.save(WalletTransaction, cancelCreditTx);
                }

                // لغو تراکنش پندینگ Fee (سهم پلتفرم)
                if (pendingFeeTx) {
                    const cancelFeeTx = manager.create(WalletTransaction, {
                        walletId: (pendingFeeTx as WalletTransaction).walletId, // کیف پول پلتفرم
                        type: WalletTransactionType.CANCEL_FEE, // تایپ جدید برای لغو
                        amount: (pendingFeeTx as WalletTransaction).amount,
                        balanceAfter: Number((pendingFeeTx as WalletTransaction).balanceAfter),
                        description: `Cancel pending fee for order #${order.id}`,
                        referenceId: order.id,
                        metadata: {...(pendingFeeTx as WalletTransaction).metadata, cancelledByRefund: true}
                    });
                    await manager.save(WalletTransaction, cancelFeeTx);
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

            order.transaction.status = TransactionStatus.REFUNDED
            await manager.save(Transaction, order.transaction)

            return {
                success: true,
                message: 'Order canceled successfully. Amount refunded to your wallet.',
                orderId: order.id,
                refundedAmount: refundAmount,
                newWalletBalance: Number(userWallet.balance)
            };
        });
    }

    async getBestSellingProducts(limit: number = 10) {
        // 1. دریافت آمار فروش
        const salesQuery = this.itemRepository
            .createQueryBuilder('item')
            .select('item.productId', 'productId')
            .addSelect('item.variantId', 'variantId')
            .addSelect('SUM(item.quantity)', 'totalSold')
            .where('item.variantId IS NOT NULL OR item.quantity > 0')
            .groupBy('item.productId')
            .addGroupBy('item.variantId')
            // اصلاح ORDER BY برای جلوگیری از ارور ستون
            .orderBy('SUM(item.quantity)', 'DESC');

        const salesData = await salesQuery.getRawMany();

        if (salesData.length === 0) {
            return [];
        }

        // 2. استخراج IDs
        const productIds = salesData.map(s => s.productId);
        const variantIds = salesData
            .filter(s => s.variantId)
            .map(s => s.variantId);

        // 3. دریافت محصولات و ورینت‌ها
        const query = this.productRepo
            .createQueryBuilder('product')
            .leftJoinAndSelect('product.variants', 'variant');

        if (productIds.length > 0) {
            query.andWhere('product.id IN (:...ids)', {ids: productIds});
        }

        const products = await query.getMany();

        // 4. پردازش نتایج
        const result = products.map(product => {
            // پیدا کردن تمام رکوردهای فروش مربوط به این محصول
            const productSales = salesData.filter(s => s.productId === product.id);

            let bestSale: any = null; // تایپ any برای جلوگیری از خطای never

            if (product.variants && product.variants.length > 0) {
                // اگر محصول ورینت دارد، پرفروش‌ترین ورینت را پیدا کن
                const variantSales = productSales.filter(s => s.variantId);
                if (variantSales.length > 0) {
                    // مرتب‌سازی و انتخاب اولی (پرفروش‌ترین)
                    variantSales.sort((a, b) => parseInt(b.totalSold) - parseInt(a.totalSold));
                    bestSale = variantSales[0];
                }
            } else {
                // اگر محصول ساده است (بدون ورینت)
                const simpleSale = productSales.find(s => !s.variantId);
                if (simpleSale) {
                    bestSale = simpleSale;
                }
            }

            // 5. ساخت خروجی نهایی با چک‌های ایمن
            if (bestSale) {
                // اگر ورینت دارد
                if (bestSale.variantId) {
                    const winningVariant = product.variants?.find(v => v.id === bestSale.variantId);
                    if (winningVariant) {
                        return {
                            ...product,
                            price: winningVariant.price,
                            stock: winningVariant.stock,
                            activeVariant: winningVariant,
                            totalSold: parseInt(bestSale.totalSold)
                        };
                    }
                } else {
                    // اگر محصول ساده است
                    return {
                        ...product,
                        totalSold: parseInt(bestSale.totalSold)
                    };
                }
            }

            // اگر فروشی پیدا نشد
            return {
                ...product,
                totalSold: 0
            };
        });

        // 6. مرتب‌سازی نهایی (اختیاری، اگر می‌خواهید بر اساس مجموع فروش کل محصول سورت شود)
        // در اینجا ما بر اساس پرفروش‌ترین آیتم (ورینت یا محصول) سورت کردیم.

        return result.slice(0, limit);
    }
}