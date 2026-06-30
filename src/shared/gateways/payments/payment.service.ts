import {BadRequestException, Injectable, Logger, NotFoundException,} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {DataSource, Repository} from 'typeorm';
import {I18nService} from 'nestjs-i18n';

import {ZarinpalGateway} from './gateways/zarinpal.gateway';
import {PaymentGateway} from './gateways/payment-gateway.interface';
import {Order} from '../../order/order.entity';
import {Transaction, TransactionStatus, TransactionType} from '../../transaction/transaction.entity';
import {User, UserRole} from '../../user/entities/user.entity';
import {Supporter} from '../../../modules/supporter/public-supporters/supporter.entity';
import {Donation, DonationMethod, DonationStatus} from '../../../modules/supporter/donation/donation.entity';
import {SupporterType} from '../../../modules/supporter/requests/request-supporter.entity';
import {KindnessMeeting} from '../../../modules/supporter/kindness-meeting/kindness-meeting.entity';
import * as bcrypt from 'bcrypt';
import {OrderStatus} from '../../order/order-status.enum';
import {WalletTransaction, WalletTransactionType} from '../../wallet/wallet-transaction.entity';
import {Wallet, WalletType} from '../../wallet/wallet.entity';
import {WalletService} from '../../wallet/wallet.service';
import {OrderType} from '../../order/order-type.enum';
import {PaymentStatus} from './payment-status-machine.enum';
import {MarketPaymentService} from '../../../modules/market/payment/market-payment.service';
import {Payment} from './payment.entity';
import {VetClinicPaymentService} from '../../../modules/vet&clinic/payment/vet-clinic-payment.service';
import {ConsultationStatus} from '../../../socket/consultation/consultation.entity';
import {Appointment} from '../../../modules/vet&clinic/entities/appointment.entity';
import {PharmacyPaymentService} from '../../../modules/pharmacy/payment/pharmacy-payment.service';
import {NotificationType} from '../../notification/notification.entity';
import {InjectQueue} from '@nestjs/bull';
import {Queue} from 'bull';

export interface PaymentResult {
    success: boolean;
    orderId?: string;
    orderCode?: string;
    refId?: string;
    amount?: number;
    deliveryDate?: any;
    deliveryTime?: any;
    needsManualReview?: boolean;
    error?: string;
    message?: string;
    txId?: string;
    // فیلدهای خاص
    items?: any[];
    customerInfo?: any;
    orderType?: string;
    appointment?: any;
    visitType?: any;
    serviceType?: any;
    doctorName?: string;
    specialty?: string;
    userId?: string;
    petId?: string;
    tenantId?: string;
    paymentDate?: any;
    servicePrice?: number;
}

@Injectable()
export class PaymentService {
    private readonly gateways: Record<string, PaymentGateway>;
    private readonly logger = new Logger(PaymentService.name);

    constructor(
        @InjectQueue('payment-reconciliation') private readonly reconciliationQueue: Queue,
        @InjectRepository(KindnessMeeting) private kindnessMeetingRepo: Repository<KindnessMeeting>,
        @InjectRepository(Donation) private donationRepo: Repository<Donation>,
        @InjectRepository(Supporter) private supporterRepo: Repository<Supporter>,
        @InjectRepository(User) private userRepo: Repository<User>,
        @InjectRepository(Order) private orderRepo: Repository<Order>,
        @InjectRepository(Transaction) public txRepo: Repository<Transaction>,
        @InjectRepository(Wallet) private walletRepo: Repository<Wallet>,
        @InjectRepository(WalletTransaction) private walletTxRepo: Repository<WalletTransaction>,
        private dataSource: DataSource,
        private readonly zarinpal: ZarinpalGateway,
        private readonly walletService: WalletService,
        private readonly marketPaymentService: MarketPaymentService,
        private readonly pharmacyPaymentService: PharmacyPaymentService,
        private readonly vetClinicPaymentService: VetClinicPaymentService,
        @InjectQueue('notifications') private readonly notificationQueue: Queue,
        private readonly i18n: I18nService,
    ) {
        this.gateways = {
            zarinpal: this.zarinpal,
        };
    }

    // ==========================================
    // 1️⃣ پرداخت عمومی (General Payment)
    // ==========================================
    async startPayment(gatewayName: string, totalAmount: number, meta: any, supporterInfo: any) {
        const gateway = this.gateways[gatewayName];
        if (!gateway) {
            throw new BadRequestException(this.i18n.translate('payment.gateway_not_supported'));
        }

        const order = await this.orderRepo.save({totalAmount});

        const transaction = await this.txRepo.save({
            gateway: gatewayName,
            amount: totalAmount,
            order,
            supporterInfo: {
                donorName: supporterInfo?.donorName,
                donorPhone: supporterInfo?.donorPhone,
                isAnonymous: supporterInfo?.isAnonymous,
                purpose: supporterInfo?.purpose,
                message: supporterInfo?.message,
                acceptTerms: supporterInfo?.acceptTerms,
                meetingId: supporterInfo?.meetingId,
                userId: supporterInfo?.userId,
            },
        });

        const result = await gateway.pay(
            totalAmount,
            `${process.env.PAYMENT_CALLBACK_URL}?tx=${transaction.id}`,
            meta,
        );

        transaction.authority = result.authority;
        await this.txRepo.save(transaction);

        return result.redirectUrl;
    }

    async verifyPayment(gatewayName: string, data: any, txId: string) {
        const gateway = this.gateways[gatewayName];
        const tx = await this.txRepo.findOne({
            where: {id: txId},
            relations: ['order'],
        });

        if (!tx) {
            throw new NotFoundException(this.i18n.translate('payment.transaction_not_found'));
        }

        try {
            const result = await gateway.verify({
                ...data,
                Amount: tx.amount,
            });

            tx.status = TransactionStatus.SUCCESS;
            tx.refId = result.RefID ?? result.refId;
            tx.order.status = OrderStatus.CUSTOMER_PAID;
            await this.txRepo.save(tx);
            await this.orderRepo.save(tx.order);

            await this.processDonationFlow(tx);

            return {
                success: true,
                orderId: tx.order.id,
                refId: tx.refId,
            };
        } catch (e) {
            tx.status = TransactionStatus.FAILED;
            tx.order.status = OrderStatus.CUSTOMER_CANCELLED;
            await this.txRepo.save(tx);
            await this.orderRepo.save(tx.order);
            return {
                success: false,
                orderId: tx.order.id,
                message: e.message,
            };
        }
    }

    private async processDonationFlow(tx: Transaction) {
        const phone = tx.supporterInfo?.donorPhone;
        if (!phone) throw new Error(this.i18n.translate('error.phone_required'));

        let user = await this.userRepo.findOne({where: {phoneNumber: phone}});
        if (!user) {
            const hashedPassword = await bcrypt.hash('12345678', 10);
            user = await this.userRepo.save({
                phoneNumber: phone,
                fullName: tx.supporterInfo?.donorName,
                isVerified: true,
                password: hashedPassword,
                legacyRoles: [UserRole.SUBSCRIBER],
            });
        }

        let supporter = await this.supporterRepo.findOne({
            where: {user: {id: user.id}},
            relations: ['user'],
        } as any);

        if (!supporter) {
            supporter = await this.supporterRepo.save({
                user,
                type: SupporterType.FINANCIAL,
                joinDate: new Date().toISOString().slice(0, 10),
                agreement: true,
                showInList: true,
            });
        }

        let kindnessMeeting: KindnessMeeting | null = null;
        if (tx.supporterInfo?.meetingId) {
            kindnessMeeting = await this.kindnessMeetingRepo.findOne({
                where: {id: tx.supporterInfo.meetingId},
            });
        }

        if (kindnessMeeting && supporter) {
            await this.donationRepo.save({
                supporter,
                kindnessMeeting,
                amount: tx.amount,
                method: DonationMethod.ONLINE,
                status: DonationStatus.COMPLETED,
                trackingCode: tx.refId,
                note: tx.supporterInfo?.message,
                date: new Date().toISOString().slice(0, 10),
                time: new Date().toLocaleTimeString('fa-IR'),
            });
        } else if (supporter) {
            await this.donationRepo.save({
                supporter,
                amount: tx.amount,
                method: DonationMethod.CARD,
                status: DonationStatus.COMPLETED,
                trackingCode: tx.refId,
                note: tx.supporterInfo?.message,
                date: new Date().toISOString().slice(0, 10),
                time: new Date().toLocaleTimeString('fa-IR'),
            });
        }
    }

    // ==========================================
    // 2️⃣ پرداخت شارژ کیف پول (Wallet)
    // ==========================================
    async startPaymentForWallet(gatewayName: string, totalAmount: number, meta: any, userId: string) {
        const gateway = this.gateways[gatewayName];
        if (!gateway) throw new BadRequestException(this.i18n.translate('payment.gateway_not_supported'));

        const order = await this.orderRepo.save({
            totalAmount,
            userId,
            type: OrderType.WALLET_CHARGE,
        });

        const transaction = await this.txRepo.save({
            gateway: gatewayName,
            amount: totalAmount,
            order,
        });

        const result = await gateway.pay(
            totalAmount,
            `${process.env.PAYMENT_CALLBACK_URL_WALLET}?tx=${transaction.id}`,
            meta,
        );

        transaction.authority = result.authority;
        await this.txRepo.save(transaction);

        return {paymentUrl: result.redirectUrl};
    }

    async verifyPaymentForWallet(gatewayName: string, data: any, txId: string) {
        const gateway = this.gateways[gatewayName];
        const tx = await this.txRepo.findOne({
            where: {id: txId},
            relations: ['order'],
        } as any);

        if (!tx) throw new NotFoundException(this.i18n.translate('payment.transaction_not_found'));

        try {
            const result = await gateway.verify({
                ...data,
                Amount: tx.amount,
            });

            tx.status = TransactionStatus.SUCCESS;
            tx.refId = result.RefID ?? result.refId;
            tx.order.status = OrderStatus.CUSTOMER_PAID;
            await this.txRepo.save(tx);
            await this.orderRepo.save(tx.order);

            await this.walletService.credit(
                tx.order.tenantId,
                tx.order.userId,
                WalletType.USER,
                tx.amount,
                this.i18n.translate('payment.wallet_charge_desc', {args: {id: tx.order.id}}),
                tx.id,
            );

            return {
                success: true,
                orderId: tx.order.id,
                refId: tx.refId,
            };
        } catch (e) {
            tx.status = TransactionStatus.FAILED;
            tx.order.status = OrderStatus.CUSTOMER_CANCELLED;
            await this.txRepo.save(tx);
            await this.orderRepo.save(tx.order);
            return {
                success: false,
                orderId: tx.order.id,
                message: e.message,
            };
        }
    }

    // ==========================================
    // 3️⃣ پرداخت مارکت‌پلیس (Market)
    // ==========================================
    async startPaymentForMarketOrder(gatewayName: string, totalAmount: number, meta: any, orderId: string, userId: string, tenantId: string) {
        const gateway = this.gateways[gatewayName];
        if (!gateway) throw new BadRequestException(this.i18n.translate('payment.gateway_not_supported'));

        const order = await this.orderRepo.findOne({where: {id: orderId}});
        if (!order) throw new NotFoundException(this.i18n.translate('order.not_found'));

        const transaction = await this.txRepo.save({
            gateway: gatewayName,
            amount: totalAmount,
            order,
            metadata: {
                userId,
                tenantId,
                type: TransactionType.MARKET_ORDER,
            },
        });

        order.transaction = transaction;
        await this.orderRepo.save(order);

        const result = await gateway.pay(
            totalAmount,
            `${process.env.PAYMENT_CALLBACK_URL_MARKET}?tx=${transaction.id}`,
            meta,
        );

        transaction.authority = result.authority;
        await this.txRepo.save(transaction);

        return {paymentUrl: result.redirectUrl};

    }

    async verifyPaymentForMarketOrder(gatewayName: string, data: any, txId: string): Promise<PaymentResult> {
        const gateway = this.gateways[gatewayName];
        const tx = await this.txRepo.findOne({
            where: {id: txId},
            relations: ['order'],
        });
        if (!tx) throw new NotFoundException(this.i18n.translate('payment.transaction_not_found'));
        if (tx.status === TransactionStatus.SUCCESS) {
            return {
                success: true,
                message: this.i18n.translate('payment.already_verified'),
                orderCode: tx.order?.orderCode,
                refId: tx.refId
            };
        }
        if (tx.status === TransactionStatus.FAILED) {
            return {success: false, message: this.i18n.translate('payment.already_failed')};
        }

        try {
            await this.dataSource.transaction(async (manager) => {
                const result = await gateway.verify({...data, Amount: tx.amount});
                tx.status = TransactionStatus.SUCCESS;
                tx.refId = result.RefID ?? result.refId;
                await manager.save(tx);

                let payment = await manager.findOne(Payment, {where: {orderId: tx.order.id}} as any);

                if (!payment) {

                    payment = manager.create(Payment, {
                        orderId: tx.order.id,
                        amount: tx.amount,
                        tenantId: tx.order.tenantId,
                        userId: tx.metadata?.userId,
                        status: PaymentStatus.PAID,
                        metadata: {referenceId: result.RefID},
                    });
                    await manager.save(payment);
                }

                await this.distributeMarketFunds(manager, tx, payment);
                await this.marketPaymentService.finalizePayment(manager, payment, gatewayName, tx.refId);
            });

            return {
                success: true,
                orderCode: tx.order.orderCode,
                amount: tx.order.totalAmount,
                deliveryDate: tx?.order?.metadata?.deliveryDate,
                deliveryTime: tx?.order?.metadata?.deliveryTime,
                refId: tx.refId,
            };
        } catch (e) {
            return this.handlePaymentError(e, tx, 'market');
        }
    }

    // ==========================================
    // 4️⃣ پرداخت کلینیک (Vet Clinic)
    // ==========================================
    async startPaymentForVetClinic(gatewayName: string, totalAmount: number, meta: any, orderId: string, userId: string, tenantId: string) {
        const gateway = this.gateways[gatewayName];
        if (!gateway) throw new BadRequestException(this.i18n.translate('payment.gateway_not_supported'));

        const order = await this.orderRepo.findOne({where: {id: orderId}});
        if (!order) throw new NotFoundException(this.i18n.translate('order.not_found'));

        let transaction = await this.txRepo.findOne({where: {order: {id: orderId}}} as any);
        if (transaction) {
            if (transaction.status === TransactionStatus.SUCCESS) {
                throw new BadRequestException(this.i18n.translate('payment.order_already_paid'));
            }
            transaction.status = TransactionStatus.PENDING;
            transaction.authority = '';
        } else {
            transaction = this.txRepo.create({
                gateway: gatewayName,
                amount: totalAmount,
                order,
                status: TransactionStatus.PENDING,
                metadata: {userId, tenantId, type: TransactionType.VET_CLINIC_ORDER},
            });
            await this.txRepo.save(transaction);
            order.transaction = transaction;
            await this.orderRepo.save(order);
        }

        const result = await gateway.pay(
            totalAmount,
            `${process.env.PAYMENT_CALLBACK_URL_VET}?tx=${transaction.id}`,
            meta,
        );

        transaction.authority = result.authority;
        transaction.status = TransactionStatus.PENDING;
        await this.txRepo.save(transaction);

        return {paymentUrl: result.redirectUrl};
    }

    async verifyPaymentForVetClinic(gatewayName: string, data: any, txId: string): Promise<PaymentResult> {
        const gateway = this.gateways[gatewayName];
        const tx = await this.txRepo.findOne({
            where: {id: txId},
            relations: ['order'],
        });

        if (!tx) throw new NotFoundException(this.i18n.translate('payment.transaction_not_found'));
        if (tx.status === TransactionStatus.SUCCESS) {
            return {
                success: true,
                message: this.i18n.translate('payment.already_verified'),
                orderCode: tx.order?.orderCode,
                refId: tx.refId
            };
        }
        if (tx.status === TransactionStatus.FAILED) {
            return {success: false, message: this.i18n.translate('payment.already_failed')};
        }

        try {
            let finalResult: any = {};
            await this.dataSource.transaction(async (manager) => {
                const result = await gateway.verify({...data, Amount: tx.amount});
                tx.status = TransactionStatus.SUCCESS;
                tx.refId = result.refId;
                await manager.save(tx);

                let payment = await manager.findOne(Payment, {where: {orderId: tx.order.id}} as any);
                if (!payment) {
                    payment = manager.create(Payment, {
                        orderId: tx.order.id,
                        amount: tx.amount,
                        tenantId: tx.order.tenantId,
                        userId: tx.metadata?.userId,
                        status: PaymentStatus.PAID,
                        metadata: {referenceId: result.RefID},
                    });
                    await manager.save(payment);
                }

                await this.distributeClinicFunds(manager, tx, payment);

                const appointment = await this.vetClinicPaymentService.finalizePayment(manager, payment, gatewayName, tx.refId);
                await manager.update(Order, {id: tx.order.id}, {status: OrderStatus.CUSTOMER_PAID});

                if (appointment) {
                    finalResult = {
                        success: true,
                        orderCode: tx.order.orderCode,
                        amount: tx.order.totalAmount,
                        refId: tx.refId,
                        paymentDate: tx.createdAt,
                        servicePrice: tx.amount,
                        userId: tx.order.userId,
                        petId: appointment.petId,
                        tenantId: tx.order.tenantId,
                        visitType: appointment.type,
                        serviceType: appointment.service,
                        doctorName: appointment.tenant?.name,
                        specialty: appointment.tenant?.specialty,
                        appointment,
                    };
                }
            });
            return finalResult;
        } catch (e) {
            return this.handlePaymentError(e, tx, 'vet');
        }
    }

    // ==========================================
    // 5️⃣ پرداخت داروخانه (Pharmacy)
    // ==========================================
    async startPaymentForPharmacyOrder(gatewayName: string, totalAmount: number, meta: any, orderId: string, userId: string, tenantId: string) {
        const gateway = this.gateways[gatewayName];
        if (!gateway) throw new BadRequestException(this.i18n.translate('payment.gateway_not_supported'));

        const order = await this.orderRepo.findOne({where: {id: orderId}, relations: ['transaction']});
        if (!order) throw new NotFoundException(this.i18n.translate('order.not_found'));

        const isRemainingPayment = meta?.type === 'remaining';
        if (isRemainingPayment) {
            const expectedRemaining = Number(order.metadata?.remainingAmount) || 0;
            if (totalAmount < expectedRemaining) {
                throw new BadRequestException(this.i18n.translate('payment.insufficient_remaining_amount'));
            }
        }

        let transaction: Transaction;
        if (!order.transaction) {
            transaction = await this.txRepo.save({
                gateway: gatewayName,
                amount: totalAmount,
                order,
                metadata: {userId, tenantId, type: TransactionType.PHARMACY_ORDER},
            });
            order.transaction = transaction;
            await this.orderRepo.save(order);
        } else {
            order.transaction.metadata = {
                ...order.transaction?.metadata,
                type: TransactionType.REMAINING_PAYMENT,
                previousOrderStatus: order.status,
            };
            await this.txRepo.save(order.transaction);
            transaction = order.transaction;
        }

        const result = await gateway.pay(
            totalAmount,
            `${process.env.PAYMENT_CALLBACK_URL_PHARMACY}?tx=${transaction.id}`,
            meta,
        );

        if (!order.transaction.authority && order.transaction.status !== TransactionStatus.SUCCESS) {
            transaction.authority = result.authority;
        } else {
            transaction.status=TransactionStatus.PENDING
            transaction.metadata = {...transaction.metadata, authorityRemaining: result.authority};
        }
        await this.txRepo.save(transaction);

        return {paymentUrl: result.redirectUrl};
    }

    async verifyPaymentForPharmacyOrder(gatewayName: string, data: any, txId: string): Promise<PaymentResult> {
        const gateway = this.gateways[gatewayName];
        const tx = await this.txRepo.findOne({
            where: {id: txId},
            relations: ['order.items.marketProduct.product', 'order.address'],
        });

        if (!tx) throw new NotFoundException(this.i18n.translate('payment.transaction_not_found'));

        try {
            await this.dataSource.transaction(async (manager) => {
                let result: any;
                let finalTotalAmountForTx: number;
                let isRemainingPayment = false;

                if (tx.metadata?.type === TransactionType.REMAINING_PAYMENT) {
                    isRemainingPayment = true;
                    const expectedRemaining = Number(tx.order.metadata?.remainingAmount) || 0;
                    result = await gateway.verify({...data, Amount: expectedRemaining});

                    const previousDeposit = Number(tx.amount) || 0;
                    const currentPayment = Number(expectedRemaining);
                    finalTotalAmountForTx = previousDeposit + currentPayment;

                    tx.depositAmount = previousDeposit;
                    tx.remainingAmount = currentPayment;
                    tx.amount = finalTotalAmountForTx;
                    tx.metadata.refIdForRemaining = result.RefID ?? result.refId;
                    tx.metadata.finalizedAt = new Date();
                    tx.status = TransactionStatus.SUCCESS;
                } else {
                    result = await gateway.verify({...data, Amount: tx.amount});
                    finalTotalAmountForTx = tx.amount;
                    tx.depositAmount = tx.amount;
                    tx.remainingAmount = 0;
                    tx.status = TransactionStatus.SUCCESS;
                    tx.refId = result.RefID ?? result.refId;
                }

                await manager.save(tx);

                let payment = await manager.findOne(Payment, {where: {orderId: tx.order.id}} as any);
                if (!payment) {
                    payment = manager.create(Payment, {
                        orderId: tx.order.id,
                        amount: tx.amount,
                        tenantId: tx.order.tenantId,
                        userId: tx.metadata?.userId,
                        status: PaymentStatus.PAID,
                        metadata: {referenceId: result.RefID ?? result.refId},
                    });
                    await manager.save(payment);
                }

                if (isRemainingPayment) {
                    payment.amount = finalTotalAmountForTx;
                    payment.depositAmount = tx.depositAmount;
                    payment.remainingAmount = tx.remainingAmount;
                    await manager.save(payment);

                    tx.order.depositAmount = tx.depositAmount;
                    tx.order.remainingAmount = 0;
                    tx.order.totalAmount = finalTotalAmountForTx;
                    tx.order.metadata = {
                        ...tx.order.metadata,
                        remainingAmount: 0,
                        fullyPaidAt: new Date().toISOString(),
                        finalMedicinePrice: tx.amount,
                    };
                    await manager.save(Order, tx.order);
                }

                await this.distributePharmacyFunds(manager, tx, payment, isRemainingPayment);
                await this.pharmacyPaymentService.finalizePayment(manager, payment, gatewayName, isRemainingPayment, tx.refId);
            });

            return {
                success: true,
                orderId: tx.order.id,
                orderCode: tx.order.orderCode,
                orderType: tx.order.type,
                amount: tx.order.totalAmount,
                items: tx.order.items.map(item => ({
                    id: item.id,
                    sellerId: item.marketProduct?.tenantId,
                    productId: item.productId,
                    name: item.marketProduct?.product?.name || 'محصول بدون نام',
                    category: item.marketProduct?.product?.categoryBreadcrumb || 'عمومی',
                    price: item.price,
                    quantity: item.quantity,
                    image: item.marketProduct?.product?.image || null,
                    originalPrice: item.marketProduct?.price || item.price,
                })),
                customerInfo: {
                    ...(tx.order?.metadata?.customerInfo || {}),
                    address: tx.order?.address?.fullAddress || '',
                    city: tx.order?.address?.city || '',
                    postalCode: tx.order?.address?.postalCode || '',
                },
                deliveryDate: tx?.order?.metadata?.deliveryDate,
                deliveryTime: tx?.order?.metadata?.deliveryTime,
                refId: tx.refId,
            };
        } catch (e) {
            return this.handlePaymentError(e, tx, 'pharmacy');
        }
    }

    // ==========================================
    // Helper Methods
    // ==========================================
    private async distributeMarketFunds(manager: any, tx: Transaction, payment: Payment) {
        const totalAmount = Number(tx.amount);
        const platformFeePercent = 5;
        const feeAmount = (totalAmount * platformFeePercent) / 100;
        const shopNetAmount = totalAmount - feeAmount;
        const releaseAt = new Date();
        releaseAt.setHours(23, 59, 59, 0);

        const platformBankWallet = await manager.findOne(Wallet, {
            where: {type: WalletType.PLATFORM_BANK},
            lock: {mode: 'pessimistic_write'},
        } as any);
        if (!platformBankWallet) throw new Error(this.i18n.translate('wallet.platform_not_found'));

        const bankTx = manager.create(WalletTransaction, {
            walletId: platformBankWallet.id,
            type: WalletTransactionType.BANK_DEPOSIT,
            amount: totalAmount,
            balanceAfter: Number(platformBankWallet.balance),
            description: this.i18n.translate('wallet.market_deposit_desc', {args: {code: tx.order.orderCode}}),
            referenceId: payment.id,
        });
        await manager.save(bankTx);
        platformBankWallet.balance = Number(platformBankWallet.balance) + totalAmount;
        await manager.save(platformBankWallet);

        const shopWallet = await manager.findOne(Wallet, {
            where: {tenantId: tx.order.tenantId, type: WalletType.SHOP},
        } as any);
        if (shopWallet) {
            const shopTx = manager.create(WalletTransaction, {
                walletId: shopWallet.id,
                type: WalletTransactionType.PENDING_CREDIT,
                amount: shopNetAmount,
                balanceAfter: Number(shopWallet.balance),
                description: this.i18n.translate('wallet.market_pending_desc', {args: {code: tx.order.orderCode}}),
                referenceId: payment.id,
                releaseAt,
            });
            await manager.save(shopTx);
        }

        const platformWallet = await manager.findOne(Wallet, {where: {type: WalletType.PETOMAN}} as any);
        if (platformWallet) {
            const platformFeeTx = manager.create(WalletTransaction, {
                walletId: platformWallet.id,
                type: WalletTransactionType.PENDING_FEE,
                amount: feeAmount,
                balanceAfter: Number(platformWallet.balance),
                description: this.i18n.translate('wallet.market_fee_desc', {args: {code: tx.order.orderCode}}),
                referenceId: payment.id,
                releaseAt,
            });
            await manager.save(platformFeeTx);
        }
    }

    private async distributeClinicFunds(manager: any, tx: Transaction, payment: Payment) {
        const totalAmount = Number(tx.amount);
        const platformFeePercent = 5;
        const feeAmount = (totalAmount * platformFeePercent) / 100;
        const sellerNetAmount = totalAmount - feeAmount;
        const releaseAt = new Date();
        releaseAt.setHours(23, 59, 59, 0);

        const platformBankWallet = await manager.findOne(Wallet, {
            where: {type: WalletType.PLATFORM_BANK},
            lock: {mode: 'pessimistic_write'},
        } as any);
        if (!platformBankWallet) throw new Error(this.i18n.translate('wallet.platform_not_found'));

        const bankTx = manager.create(WalletTransaction, {
            walletId: platformBankWallet.id,
            type: WalletTransactionType.BANK_DEPOSIT,
            amount: totalAmount,
            balanceAfter: Number(platformBankWallet.balance),
            description: this.i18n.translate('wallet.clinic_deposit_desc', {args: {code: tx.order.orderCode}}),
            referenceId: payment.id,
        });
        await manager.save(bankTx);
        platformBankWallet.balance = Number(platformBankWallet.balance) + totalAmount;
        await manager.save(platformBankWallet);

        const clinicWallet = await manager.findOne(Wallet, {
            where: {tenantId: tx.order.tenantId, type: WalletType.SHOP},
        } as any);
        if (clinicWallet) {
            const clinicTx = manager.create(WalletTransaction, {
                walletId: clinicWallet.id,
                type: WalletTransactionType.PENDING_CREDIT,
                amount: sellerNetAmount,
                balanceAfter: Number(clinicWallet.balance),
                description: this.i18n.translate('wallet.clinic_pending_desc', {args: {code: tx.order.orderCode}}),
                referenceId: payment.id,
                releaseAt,
            });
            await manager.save(clinicTx);
        }

        const platformWallet = await manager.findOne(Wallet, {where: {type: WalletType.PETOMAN}} as any);
        if (platformWallet) {
            const platformFeeTx = manager.create(WalletTransaction, {
                walletId: platformWallet.id,
                type: WalletTransactionType.PENDING_FEE,
                amount: feeAmount,
                balanceAfter: Number(platformWallet.balance),
                description: this.i18n.translate('wallet.clinic_fee_desc', {args: {code: tx.order.orderCode}}),
                referenceId: payment.id,
                releaseAt,
            });
            await manager.save(platformFeeTx);
        }
    }

    private async distributePharmacyFunds(manager: any, tx: Transaction, payment: Payment, isRemainingPayment: boolean) {

        let totalAmount = Number(tx.amount);
        if (isRemainingPayment) {
            totalAmount = Number(tx.remainingAmount);
        }

        const platformFeePercent = 5;
        const feeAmount = (totalAmount * platformFeePercent) / 100;
        const shopNetAmount = totalAmount - feeAmount;
        const releaseAt = new Date();
        releaseAt.setHours(23, 59, 59, 0);

        const platformBankWallet = await manager.findOne(Wallet, {
            where: {type: WalletType.PLATFORM_BANK},
            lock: {mode: 'pessimistic_write'},
        } as any);
        if (!platformBankWallet) throw new Error(this.i18n.translate('wallet.platform_not_found'));

        const bankTx = manager.create(WalletTransaction, {
            walletId: platformBankWallet.id,
            type: WalletTransactionType.BANK_DEPOSIT,
            amount: totalAmount,
            balanceAfter: Number(platformBankWallet.balance),
            description: this.i18n.translate('wallet.pharmacy_deposit_desc', {args: {code: tx.order.orderCode}}),
            referenceId: payment.id,
        });
        await manager.save(bankTx);
        platformBankWallet.balance = Number(platformBankWallet.balance) + totalAmount;
        await manager.save(platformBankWallet);

        const pharmacyWallet = await manager.findOne(Wallet, {
            where: {tenantId: tx.order.tenantId, type: WalletType.SHOP},
        } as any);
        if (pharmacyWallet) {
            const shopTx = manager.create(WalletTransaction, {
                walletId: pharmacyWallet.id,
                type: WalletTransactionType.PENDING_CREDIT,
                amount: shopNetAmount,
                balanceAfter: Number(pharmacyWallet.balance),
                description: this.i18n.translate('wallet.pharmacy_pending_desc', {args: {code: tx.order.orderCode}}),
                referenceId: payment.id,
                releaseAt,
            });
            await manager.save(shopTx);
        }

        const platformWallet = await manager.findOne(Wallet, {where: {type: WalletType.PETOMAN}} as any);
        if (platformWallet) {
            const platformFeeTx = manager.create(WalletTransaction, {
                walletId: platformWallet.id,
                type: WalletTransactionType.PENDING_FEE,
                amount: feeAmount,
                balanceAfter: Number(platformWallet.balance),
                description: this.i18n.translate('wallet.pharmacy_fee_desc', {args: {code: tx.order.orderCode}}),
                referenceId: payment.id,
                releaseAt,
            });
            await manager.save(platformFeeTx);
        }
    }

    private handlePaymentError(e: any, tx: Transaction, context: string) {
        const errorMessage = e.message.toLowerCase();

        if (
            errorMessage.includes('لغو') ||
            errorMessage.includes('cancel') ||
            errorMessage.includes('خطای بانکی') ||
            errorMessage.includes('bank error') ||
            errorMessage.includes('not verified')
        ) {
            tx.status = TransactionStatus.FAILED;
            try {
                this.txRepo.save(tx);
            } catch (saveError) {
                this.logger.error(`Failed to save transaction status in ${context}`, saveError);
            }
            throw e;
        }

        this.logger.error(`Payment error in ${context}: ${e.message}`);
        return {
            success: false,
            orderId: tx.order?.id,
            orderCode: tx.order?.orderCode,
            needsManualReview: true,
            error: this.i18n.translate('payment.finalization_error', {args: {msg: e.message}}),
            message: this.i18n.translate('payment.manual_review_needed'),
            txId: tx.id,
        };
    }

    async createOrUpdateConsultation(data: {
        userId: string;
        petId: string;
        tenantId: string;
        orderId: string;
        appointment: Appointment;
        specialty?: string;
    }) {
        const {userId, petId, tenantId, orderId, appointment, specialty} = data;
        const consultationRepo = this.dataSource.getRepository('Consultation');

        let consultation = await consultationRepo.findOne({
            where: {appointment: {id: appointment.id}},
        } as any);

        if (!consultation) {
            consultation = consultationRepo.create({
                userId,
                petId,
                tenantId,
                appointment,
                specialty,
                status: ConsultationStatus.REQUEST_SENT,
                unreadCount: 0,
            });
        } else {
            consultation.status = ConsultationStatus.REQUEST_SENT;
            consultation.specialty = specialty;
        }
        return await consultationRepo.save(consultation);
    }

    async setConsultationToAppointment(appointmentId: string, consultationId: string) {
        const appointmentRepo = this.dataSource.getRepository(Appointment);
        const appointment = await appointmentRepo.findOne({where: {id: appointmentId}});

        if (!appointment) {
            throw new NotFoundException(this.i18n.translate('appointment.not_found'));
        }
        appointment.consultationId = consultationId;
        await appointmentRepo.save(appointment);
    }

    async initiateRefund(orderId: string, reason: string) {
        return this.dataSource.transaction(async (manager) => {
            const payment = await manager.findOne(Payment, {
                where: {orderId},
                relations: ['order'],
            } as any);

            if (!payment) return {success: false, message: this.i18n.translate('payment.not_found')};
            if (payment.status !== PaymentStatus.PAID) return {
                success: false,
                message: this.i18n.translate('payment.not_paid')
            };

            const order = payment.order;
            const refundAmount = Number(payment.amount);

            let refundResult: any = {success: true};
            if (payment.method !== 'wallet') {
                try {
                    refundResult = await this.gateways['zarinpal'].refund?.({
                        authority: payment.metadata?.authority,
                        amount: refundAmount,
                    });
                } catch (error) {
                    return {success: false, message: this.i18n.translate('payment.refund_gateway_error')};
                }
            }

            const platformBankWallet = await manager.findOne(Wallet, {
                where: {type: WalletType.PLATFORM_BANK},
                lock: {mode: 'pessimistic_write'},
            } as any);

            if (!platformBankWallet) return {success: false, message: this.i18n.translate('wallet.platform_not_found')};
            if (Number(platformBankWallet.balance) < refundAmount) {
                return {success: false, message: this.i18n.translate('wallet.insufficient_balance')};
            }

            const newBankBalance = Number(platformBankWallet.balance) - refundAmount;
            platformBankWallet.balance = newBankBalance;
            await manager.save(platformBankWallet);

            const bankTx = manager.create(WalletTransaction, {
                walletId: platformBankWallet.id,
                type: WalletTransactionType.BANK_REFUND,
                amount: refundAmount,
                balanceAfter: newBankBalance,
                description: this.i18n.translate('wallet.refund_desc', {args: {reason, code: order.orderCode}}),
                referenceId: payment.id,
            });
            await manager.save(bankTx);

            const userWallet = await manager.findOne(Wallet, {
                where: {userId: order.userId, type: WalletType.USER},
            } as any);

            if (!userWallet) return {success: false, message: this.i18n.translate('wallet.user_not_found')};

            const newUserBalance = Number(userWallet.balance) + refundAmount;
            userWallet.balance = newUserBalance;
            await manager.save(userWallet);

            const userWalletTx = manager.create(WalletTransaction, {
                walletId: userWallet.id,
                type: WalletTransactionType.REFUND,
                amount: refundAmount,
                balanceAfter: newUserBalance,
                description: this.i18n.translate('wallet.user_refund_desc', {args: {reason, code: order.orderCode}}),
                referenceId: payment.id,
            });
            await manager.save(userWalletTx);

            payment.status = PaymentStatus.REFUNDED;
            payment.metadata = {
                ...payment.metadata,
                refundedAt: new Date(),
                refundReason: reason,
                refundRefId: refundResult.RefID ?? refundResult.refId ?? null,
            };
            await manager.save(payment);

            order.status = OrderStatus.TENANT_REFUND;
            await manager.save(order);

            try {
                await this.notificationQueue.add('handle-notification', {
                    userId: order.userId,
                    type: NotificationType.IN_APP,
                    title: this.i18n.translate('notification.refund_success_title'),
                    message: this.i18n.translate('notification.refund_success_msg', {args: {amount: refundAmount.toLocaleString('fa-IR')}}),
                    icon: 'wallet',
                    color: 'success',
                    panelType: 'VET-CLINIC-PHARMACY',
                    data: {orderId: order.id, refundAmount},
                });
            } catch (error) {
                this.logger.error('Notification queue error during refund', error);
            }

            return {
                success: true,
                refundId: `REF-${Date.now()}`,
                amount: refundAmount,
                message: this.i18n.translate('payment.refund_success', {args: {amount: refundAmount.toLocaleString('fa-IR')}}),
            };
        });
    }
}