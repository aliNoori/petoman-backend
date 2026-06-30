import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {AdminPanelController} from "./panel.controller";
import {AdminPanelService} from "./panel.service";
import {Withdrawal} from "../../../../modules/market/request/entities/withdrawal.entity";
import {User} from "../../../user/entities/user.entity";
import {Order} from "../../../order/order.entity";
import {Tenant} from "../../../../core/entities/tenant.entity";
import {Consultation} from "../../../../socket/consultation/consultation.entity";


@Module({
    imports: [TypeOrmModule.forFeature([User,Order,Tenant,Withdrawal,Consultation])],
    controllers: [AdminPanelController],
    providers: [AdminPanelService],
    exports: [AdminPanelService],
})
export class AdminPanelModule {}