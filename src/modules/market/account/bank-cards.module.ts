import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankCardsService } from './bank-cards.service';
import { BankCardsController } from './bank-cards.controller';
import {BankCard} from "./bank-card.entity";
import {User} from "../../../shared/user/entities/user.entity";
import {TenantModule} from "../../../tenants/tenant.module";


@Module({
    imports: [TypeOrmModule.forFeature([BankCard, User]),TenantModule],
    controllers: [BankCardsController],
    providers: [BankCardsService],
    exports: [BankCardsService],
})
export class BankCardsModule {}