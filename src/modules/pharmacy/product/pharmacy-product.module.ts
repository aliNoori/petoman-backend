import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import {TenantModule} from "../../../tenants/tenant.module";
import {ProductFeature} from "../../market/product/entities/product-feature.entity";
import {MarketProduct} from "../../market/product/entities/product.entity";
import {ProductVariant} from "../../market/product/entities/product-variant.entity";
import {ProductSpecification} from "../../market/product/entities/product-specification.entity";
import {ProductTenantCategory} from "../../market/product/entities/product-category.entity";
import {ProductLike} from "../../market/product/entities/product-like.entity";
import {PharmacyProductController} from "./pharmacy-product.controller";
import {PharmacyProductService} from "./pharmacy-product.service";
import {NotificationModule} from "../../../shared/notification/notification.module";


@Module({
    imports: [TypeOrmModule.forFeature([MarketProduct,ProductFeature,
        ProductVariant,ProductSpecification,
        ProductTenantCategory,ProductLike]),
        TenantModule,NotificationModule],
    controllers: [PharmacyProductController],
    providers: [PharmacyProductService],
    exports: [PharmacyProductService],
})
export class PharmacyProductModule {}
