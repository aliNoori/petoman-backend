import {DataSource} from "typeorm";
import {WalletService} from "../../../shared/wallet/wallet.service";
import {BadRequestException, Injectable} from "@nestjs/common";
import {TenantContext} from "../../../tenants/tenant-context.service";
import {Order} from "../../../shared/order/order.entity";
import {OrderStatus} from "../../../shared/order/order-status.enum";
import {Payment} from "../../../shared/gateways/payments/payment.entity";
import {PaymentStatus} from "../../../shared/gateways/payments/payment-status-machine.enum";

@Injectable()
export class MarketRefundService {
    constructor(
        private dataSource: DataSource,
        private walletService: WalletService,
        private tenantContext:TenantContext
    ) {}

    /**
     * Cancel paid order and refund wallet
     */
    /*async refundOrder(orderId: string,userId:string) {
        return this.dataSource.transaction(async (manager) => {
            const tenantId = this.tenantContext.getTenantId();
            //const userId = this.userContext.getUserId();

            /!** 1️⃣ Load order *!/
            const order = await manager.findOne(Order, {
                where: {
                    id: orderId,
                    tenantId,
                    userId,
                    status: OrderStatus.PAID,
                },
            });

            if (!order) {
                throw new BadRequestException('Order is not refundable');
            }

            /!** 2️⃣ Load payment *!/
            const payment = await manager.findOne(Payment, {
                where: {
                    orderId: order.id,
                    status: PaymentStatus.PAID,
                },
                select:['id','orderId','status','amount']
            } as any);

            if (!payment) {
                throw new BadRequestException('Payment not found or already refunded');
            }

            /!** 3️⃣ Wallet *!/
            const wallet = await this.walletService.getOrCreateWallet(
                manager,
                tenantId,
                userId,
            );

            /!** 4️⃣ Credit wallet *!/
            await this.walletService.credit(
                manager,
                wallet,
                payment.amount,
                `Refund for order ${order.id}`,
                payment.id,
            );

            /!** 5️⃣ Update payment *!/
            payment.status = PaymentStatus.REFUNDED;
            await manager.save(payment);

            /!** 6️⃣ Update order *!/
            order.status = OrderStatus.CANCELED;
            await manager.save(order);

            return {
                orderId: order.id,
                refundedAmount: payment.amount,
            };
        });
    }*/
}