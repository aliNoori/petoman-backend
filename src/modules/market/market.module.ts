import {Module} from '@nestjs/common'
import {TypeOrmModule} from '@nestjs/typeorm'
import {MarketProduct} from "./product/entities/product.entity";
import {ProductModule} from "./product/product.module";
import {ProductController} from "./product/product.controller";
import {ProductService} from "./product/product.service";
import {TenantModule} from "../../tenants/tenant.module";
import {TenantCategoryModule} from "./category/tenant-category.module";
import {MarketOrderModule} from "./order/market-order.module";
import {MarketPaymentModule} from "./payment/market-payment.module";
import {ProductReviewModule} from "./review/product-review.module";
import {ProductRatingModule} from "./rating/product-rating.module";
import {UserShopModule} from "./user/shops/user-shop.module";
import {AdminShopModule} from "./admin/shops/admin-shop.module";
import {ShopModule} from "./shop/shop.module";
import {AdminProductModule} from "./admin/products/admin-product.module";
import {ShopReviewModule} from "./review/shop-review.module";
import {ShopRatingModule} from "./rating/shop-rating.module";
import {UserProductModule} from "./user/product/user-product.module";
import {UserTenantCategoryModule} from "./user/category/user-tenant-category.module";
import {ProductFeature} from "./product/entities/product-feature.entity";
import {ProductVariant} from "./product/entities/product-variant.entity";
import {ProductSpecification} from "./product/entities/product-specification.entity";
import {MarketSettingModule} from "./settings/market-setting.module";
import {UserOrderModule} from "./user/orders/user-order.module";
import {MarketController} from "./market.controller";
import {MarketService} from "./market.service";
import {Tenant} from "../../core/entities/tenant.entity";
import {WithdrawalsModule} from "./request/withdrawals.module";
import {BankCardsModule} from "./account/bank-cards.module";


@Module({
    imports: [TypeOrmModule.forFeature([Tenant, MarketProduct, ProductFeature, ProductVariant, ProductSpecification]), ProductModule, TenantModule, TenantCategoryModule, MarketOrderModule,
        MarketPaymentModule, ProductReviewModule, ProductRatingModule, ShopModule, ShopReviewModule, ShopRatingModule, AdminShopModule,
        AdminProductModule, UserShopModule, UserProductModule, UserTenantCategoryModule, MarketSettingModule,
        UserOrderModule,WithdrawalsModule,BankCardsModule],
    controllers: [ProductController, MarketController],
    providers: [ProductService, MarketService],
})
export class MarketModule {
}
