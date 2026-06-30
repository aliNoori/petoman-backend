import {Module} from '@nestjs/common'
import {TypeOrmModule} from '@nestjs/typeorm'
import {Tenant} from "../../core/entities/tenant.entity";
import {MarketProduct} from "../market/product/entities/product.entity";
import {ProductFeature} from "../market/product/entities/product-feature.entity";
import {ProductVariant} from "../market/product/entities/product-variant.entity";
import {ProductSpecification} from "../market/product/entities/product-specification.entity";
import {TenantModule} from "../../tenants/tenant.module";
import {PharmacyPaymentModule} from "./payment/pharmacy-payment.module";
import {PharmacyReviewModule} from "./review/pharmacy/pharmacy-review.module";
import {PharmacyProductModule} from "./product/pharmacy-product.module";
import {TenantCategoryModule} from "../market/category/tenant-category.module";
import {PharmacyReviewProductModule} from "./review/product/pharmacy-review-product.module";
import {PharmacySettingModule} from "./settings/pharmacy-setting.module";
import {PharmacyProductController} from "./product/pharmacy-product.controller";
import {PharmacyProductService} from "./product/pharmacy-product.service";
import {PharmacyController} from "./pharmacy.controller";
import {PharmacyService} from "./pharmacy.service";
import {PharmacyOrderModule} from "./order/pharmacy-order.module";
import {NotificationModule} from "../../shared/notification/notification.module";



@Module({
    imports: [TypeOrmModule.forFeature([Tenant, MarketProduct,
        ProductFeature, ProductVariant, ProductSpecification]), PharmacyProductModule,
        TenantModule, TenantCategoryModule, PharmacyOrderModule,
        PharmacyPaymentModule, PharmacyReviewModule,PharmacyReviewProductModule,PharmacySettingModule,NotificationModule],
    controllers: [PharmacyProductController, PharmacyController],
    providers: [PharmacyProductService, PharmacyService],
})
export class PharmacyModule {
}
