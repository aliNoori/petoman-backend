import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import {ProductController} from "./product.controller";
import {ProductService} from "./product.service";
import {MarketProduct} from "./entities/product.entity";
import {TenantModule} from "../../../tenants/tenant.module";
import {ProductTenantCategory} from "./entities/product-category.entity";
import {ProductFeature} from "./entities/product-feature.entity";
import {ProductVariant} from "./entities/product-variant.entity";
import {ProductSpecification} from "./entities/product-specification.entity";
import {ProductLike} from "./entities/product-like.entity";

@Module({
    imports: [TypeOrmModule.forFeature([MarketProduct,ProductFeature,
        ProductVariant,ProductSpecification,
        ProductTenantCategory,ProductLike]),
        TenantModule],
    controllers: [ProductController],
    providers: [ProductService],
    exports: [ProductService],
})
export class ProductModule {}
