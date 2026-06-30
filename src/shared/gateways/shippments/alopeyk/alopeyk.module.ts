import { Module } from '@nestjs/common';
import {AlopeykService} from "./alopeyk.service";
import {AlopeykController} from "./alopeyk.controller";
import {TypeOrmModule} from "@nestjs/typeorm";
import {UserOrderModule} from "../../../../modules/market/user/orders/user-order.module";
import {JwtModule} from "@nestjs/jwt";
import {SessionModule} from "../../../user/session.module";
import {TenantModule} from "../../../../tenants/tenant.module";

@Module({
    imports: [TypeOrmModule.forFeature([]),UserOrderModule,TenantModule,JwtModule,SessionModule],
    controllers: [AlopeykController],
    providers: [AlopeykService],
    exports: [AlopeykService],
})
export class AlopeykModule {}
