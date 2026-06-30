import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {AdminProductController} from "./admin-product.controller";
import {AdminProductService} from "./admin-product.service";
import {MarketProduct} from "../../product/entities/product.entity";
import {Product} from "../../../../shared/product/product.entity";
import {ProductReview} from "../../review/product-review.entity";
import {NotificationModule} from "../../../../shared/notification/notification.module";
import {QueuesModule} from "../../../../shared/queue/queues.module";

@Module({
    imports: [TypeOrmModule.forFeature([MarketProduct,Product,ProductReview]),QueuesModule,NotificationModule],
    controllers: [AdminProductController],
    providers: [AdminProductService],
    exports: [AdminProductService], // Export service if used in other modules
})
export class AdminProductModule {}