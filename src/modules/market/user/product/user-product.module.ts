import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import {MarketProduct} from "../../product/entities/product.entity";
import {UserProductController} from "./user-product.controller";
import {UserProductService} from "./user-product.service";


@Module({
    imports: [TypeOrmModule.forFeature([MarketProduct])],
    controllers: [UserProductController],
    providers: [UserProductService],
    exports: [UserProductService],
})
export class UserProductModule {}
