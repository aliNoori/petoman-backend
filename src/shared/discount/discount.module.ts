import { Module } from "@nestjs/common";
import { DiscountController } from "./discount.controller";
import { DiscountService } from "./discount.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Discount } from "./discount.entity";
import {JwtModule} from "@nestjs/jwt";
import {SessionModule} from "../user/session.module";

@Module({
    imports: [TypeOrmModule.forFeature([Discount]),JwtModule,SessionModule],
    controllers: [DiscountController],
    providers: [DiscountService],
    exports: [DiscountService]
})
export class DiscountModule {}