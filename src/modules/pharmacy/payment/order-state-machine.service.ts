import {BadRequestException, Injectable, NotFoundException} from "@nestjs/common";
import {DataSource, EntityManager} from "typeorm";
import {Order} from "../../../shared/order/order.entity";
import {OrderStatus} from "../../../shared/order/order-status.enum";
import {NotificationType} from "../../../shared/notification/notification.entity";
import {I18nService} from "nestjs-i18n";
import {InjectQueue} from "@nestjs/bull";
import {Queue} from "bull";
import {NotificationService} from "../../../shared/notification/notification.service";

@Injectable()
export class OrderStateMachineService {
    private readonly transitions = {
        [OrderStatus.PENDING_REMAINING_PAYMENT]: [
            OrderStatus.TENANT_PROCESSING,
            //OrderStatus.CUSTOMER_CANCELLED,
            OrderStatus.TENANT_CANCELLED
        ],
        [OrderStatus.CUSTOMER_PENDING]: [
            OrderStatus.PENDING_REMAINING_PAYMENT,
            OrderStatus.CUSTOMER_PAID,
            OrderStatus.CUSTOMER_CANCELLED,
            OrderStatus.TENANT_CANCELLED
        ],
        [OrderStatus.CUSTOMER_PAID]: [
            OrderStatus.PENDING_REMAINING_PAYMENT,
            OrderStatus.TENANT_PROCESSING,
            OrderStatus.CUSTOMER_CANCELLED,
            OrderStatus.TENANT_CANCELLED
        ],
        [OrderStatus.TENANT_PROCESSING]: [
            OrderStatus.TENANT_SHIPPED,
            OrderStatus.CUSTOMER_CANCELLED,
            OrderStatus.TENANT_CANCELLED
        ],
        [OrderStatus.TENANT_SHIPPED]: [
            OrderStatus.CUSTOMER_DELIVERED
        ],
        [OrderStatus.CUSTOMER_DELIVERED]: [
            OrderStatus.CUSTOMER_REFUNDED
        ],
        [OrderStatus.CUSTOMER_CANCELLED]: [],
        [OrderStatus.TENANT_CANCELLED]: [],
        [OrderStatus.CUSTOMER_REFUNDED]: []
    };

    constructor(
        private dataSource: DataSource,
        private readonly i18n: I18nService,
        @InjectQueue('send-sms') private smsQueue: Queue,
        private notifService: NotificationService
    ) {
    }

    /**
     * تغییر وضعیت سفارش با اعتبارسنجی قوانین FSM و ارسال نوتیفیکیشن/SMS
     */
    async transitionOrder(
        orderId: string,
        newStatus: OrderStatus,
        manager?: EntityManager,
        panelType?:string,
        actorId?: string
    ) {
        const repository = manager ? manager.getRepository(Order) : this.dataSource.getRepository(Order);
        const order = await repository.findOne({where: {id: orderId},relations:['user']});

        if (!order) {
            throw new NotFoundException('سفارش یافت نشد');
        }

        const currentStatus = order.status;
        const allowedTransitions = this.transitions[currentStatus] as OrderStatus || [];

        if (!allowedTransitions.includes(newStatus)) {
            throw new BadRequestException(
                `تغییر وضعیت از ${currentStatus} به ${newStatus} مجاز نیست.`
            );
        }

        // ۱. اعمال تغییر وضعیت
        order.status = newStatus;

        // ذخیره سفارش برای اطمینان از آپدیت شدن قبل از ارسال نوتیفیکیشن (اگر نیاز به تراکنش دقیق دارید)
        const updatedOrder = await repository.save(order);

        // ۲. تولید محتوای پیام بر اساس وضعیت جدید
        const messageContent = this.getMessageForStatus(newStatus, updatedOrder);
        const notifTitle = this.getTitleForStatus(newStatus);

        // ۳. ارسال نوتیفیکیشن داخل برنامه (In-App)
        try {
            if (updatedOrder.userId) {
                await this.notifService.create({
                    userId: updatedOrder.userId, // اصلاح شده: استفاده از userId سفارش
                    type: NotificationType.IN_APP,
                    title: notifTitle,
                    message: messageContent,
                    icon: 'ti ti-package text-blue-600', // آیکون مناسب برای سفارش
                    color: 'bg-blue-50',
                    panelType: panelType??'' // نوع پنل برای هندل کردن در فرانت
                });
            }
        } catch (error) {
            console.error('Error sending notification:', error);
            // جلوگیری از قطع شدن فرآیند سفارش در صورت خطای نوتیفیکیشن
        }

        // ۴. ارسال پیامک (SMS) از طریق صف Bull
        try {
            // فرض بر این است که رابطه User لود شده است یا شماره تلفن در متادیتا هست
            // در اینجا از order.user.phoneNumber استفاده می‌کنیم (اگر رابطه وجود دارد)
            // یا اگر شماره تلفن مستقیماً در متادیتا ذخیره شده:
            const phoneNumber = (updatedOrder as any).user?.phoneNumber || (updatedOrder.metadata as any)?.phone;

            if (phoneNumber) {
                await this.smsQueue.add('handle-send-sms', {
                    phoneNumber: phoneNumber,
                    message: messageContent
                });
            }
        } catch (error) {
            console.error('Error adding SMS job to queue:', error);
        }

        // ۵. ثبت در تاریخچه (اختیاری)
        //await this.logStatusChange(updatedOrder.id, currentStatus, newStatus, actorId, manager);

        return updatedOrder;
    }

    /**
     * متد کمکی برای تولید متن پیام بر اساس وضعیت
     */
    private getMessageForStatus(status: OrderStatus, order: Order): string {
        switch (status) {
            case OrderStatus.TENANT_PROCESSING:
                return `سفارش شما با کد ${order.orderCode || order.id.slice(-6)} تایید شد و در حال آماده‌سازی است.`;
            case OrderStatus.TENANT_SHIPPED:
                const trackingCode = order.metadata?.trackingCode;
                let message = `سفارش شما با کد ${order.orderCode || order.id.slice(-6)} ارسال شد.`;
                if (trackingCode) {
                    message += ` کد پیگیری شما: ${trackingCode}`;
                }
                return message;
            case OrderStatus.CUSTOMER_DELIVERED:
                return `سفارش شما با کد ${order.orderCode || order.id.slice(-6)} با موفقیت تحویل داده شد. از خرید شما متشکریم.`;
            case OrderStatus.CUSTOMER_CANCELLED:
            case OrderStatus.TENANT_CANCELLED:
                return `سفارش شما با کد ${order.orderCode || order.id.slice(-6)} لغو شد.`;
            case OrderStatus.PENDING_REMAINING_PAYMENT:
                return `سفارش شما با کد ${order.orderCode || order.id.slice(-6)} آماده پرداخت مابقی شد.`;
            default:
                return `وضعیت سفارش ${order.orderCode || order.id.slice(-6)} تغییر یافت.`;
        }
    }

    /**
     * متد کمکی برای تولید عنوان نوتیفیکیشن
     */
    private getTitleForStatus(status: OrderStatus): string {
        switch (status) {
            case OrderStatus.TENANT_PROCESSING:
                return 'سفارش تایید شد';
            case OrderStatus.TENANT_SHIPPED:
                return 'سفارش ارسال شد';
            case OrderStatus.CUSTOMER_DELIVERED:
                return 'تحویل سفارش';
            case OrderStatus.CUSTOMER_CANCELLED:
                return 'لغو سفارش';
            default:
                return 'به‌روزرسانی سفارش';
        }
    }

    async getOrderStatus(orderId: string): Promise<OrderStatus> {
        const order = await this.dataSource.getRepository(Order).findOne({
            where: {id: orderId}
        });
        if (!order) throw new NotFoundException('سفارش یافت نشد');
        return order.status;
    }

    private async logStatusChange(
        orderId: string,
        oldStatus: OrderStatus,
        newStatus: OrderStatus,
        actorId: string | undefined,
        manager?: EntityManager
    ) {
        // پیاده‌سازی لاگ تغییرات در متادیتا یا جدول جداگانه
        const repo = manager ? manager.getRepository(Order) : this.dataSource.getRepository(Order);
        const order = await repo.findOne({ where: { id: orderId } });
        if (order) {
            const history = order.metadata?.history || [];
            history.push({ status: newStatus, date: new Date(), actor: actorId });
            order.metadata = { ...order.metadata, history };
            await repo.save(order);
        }
    }
}