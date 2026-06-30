import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order} from "../../../shared/order/order.entity";

@Injectable()
export class TrackingService {
    constructor(
        @InjectRepository(Order)
        private orderRepo: Repository<Order>,
    ) {}

    /**
     * ثبت کد رهگیری دستی (بدون وب سرویس)
     * مدیر کد را وارد می‌کند و ما ذخیره می‌کنیم
     */
    async saveManualTrackingCode(orderId: string, trackingCode: string, provider: string = 'manual') {
        const order = await this.orderRepo.findOne({ where: { id: orderId } });
        if (!order) throw new BadRequestException('سفارش یافت نشد');

        // آپدیت متادیتا
        const currentMetadata = order.metadata || {};
        order.metadata = {
            ...currentMetadata,
            trackingCode: trackingCode,
            shippingProvider: provider,
            trackedAt: new Date().toISOString(),
        };

        return await this.orderRepo.save(order);
    }

    /**
     * (آینده) درخواست ارسال از طریق الوپیک
     * این متد را وقتی بخواهید الوپیک را فعال کنید استفاده کنید
     */
    async requestAlopeykDelivery(orderId: string) {
        const order = await this.orderRepo.findOne({ where: { id: orderId } });
        if (!order) throw new BadRequestException('سفارش یافت نشد');

        // ۱. دریافت توکن الوپیک (باید در ENV باشد)
        // const token = process.env.ALOPEYK_TOKEN;

        // ۲. ساخت بدنه درخواست بر اساس آدرس مشتری
        // const payload = { ... };

        // ۳. ارسال درخواست به API الوپیک (مثلا با HttpService)
        // const response = await this.httpService.post(...).toPromise();

        // ۴. ذخیره کد رهگیری دریافتی از الوپیک در دیتابیس
        // order.metadata = { ...order.metadata, trackingCode: response.data.track_code, shippingProvider: 'alopeyk' };

        // return await this.orderRepo.save(order);

        throw new BadRequestException('اتصال به الوپیک هنوز فعال نشده است');
    }
}