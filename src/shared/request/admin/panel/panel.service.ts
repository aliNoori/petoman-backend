import {BadRequestException, Injectable} from '@nestjs/common';
import {Tenant} from "../../../../core/entities/tenant.entity";
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {Order} from "../../../order/order.entity";
import {User} from "../../../user/entities/user.entity";
import {OrderStatus} from "../../../order/order-status.enum";
import {Withdrawal} from "../../../../modules/market/request/entities/withdrawal.entity";
import {Consultation} from "../../../../socket/consultation/consultation.entity";

@Injectable()
export class AdminPanelService {
    constructor(
        // تزریق ریپازیتوری Tenant
        @InjectRepository(Tenant)
        private readonly tenantRepository: Repository<Tenant>,
        @InjectRepository(Order)
        private readonly orderRepository: Repository<Order>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Withdrawal)
        private readonly withdrawalRepository: Repository<Withdrawal>,
        @InjectRepository(Consultation)
        private readonly consultationRepository: Repository<Consultation>,

    ) {
    }

    async getStats() {
        try {
            // محاسبه تعداد هر نوع با استفاده از type
            const [totalMarkets,
                totalPharmacies, totalClinics, totalVets,
                totalOrders, totalUsers, pendingWithdrawals,todayConsults] = await Promise.all([
                this.tenantRepository.count({where: {type: 'MARKET'}} as any),
                this.tenantRepository.count({where: {type: 'PHARMACY'}} as any),
                this.tenantRepository.count({where: {type: 'CLINIC'}} as any),
                this.tenantRepository.count({where: {type: 'VET'}} as any),
                this.orderRepository.count({where: {status: OrderStatus.CUSTOMER_DELIVERED}}),
                this.userRepository.count(),
                this.withdrawalRepository.count({where: {status: 'pending'}} as any),
                this.consultationRepository.count()
            ]);

            return {
                totalUsers,
                totalMarkets,
                totalPharmacies,
                totalClinics,
                totalVets,
                totalOrders,
                pendingWithdrawals,
                todayConsults,
            };
        } catch (error) {
            console.error('Error fetching stats:', error);
            throw new BadRequestException('خطا در دریافت اطلاعات آمار');
        }
    }
}