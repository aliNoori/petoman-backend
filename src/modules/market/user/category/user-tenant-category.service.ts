import {Injectable} from '@nestjs/common';
import {DataSource, IsNull, Not} from 'typeorm';
import {TenantCategory} from "../../category/tenant-category.entity";
import {TenantType} from "../../../../core/entities/tenant.entity";


@Injectable()
export class UserTenantCategoryService {
    constructor(
        private readonly dataSource: DataSource,
    ) {
    }

    /**
     * Get all categories for current tenant
     */
    async getCategories(): Promise<TenantCategory[]> {
        return this.dataSource.getRepository(TenantCategory).find({
            order: {createdAt: 'ASC'},
        });
    }

    async getCategoryWithProducts(): Promise<any> {

        const categories = await this.dataSource.getRepository(TenantCategory).find({
            relations: {
                // 1. Load children
                children: {
                    // 2. Load products for the children as well!
                    productTenantCategories: true
                },

                // 3. Load products for the parent (Main category)
                productTenantCategories: {
                    product: {
                        product: {
                            brand: true,
                        },
                        reviews: true,
                        features: true,
                        specifications: true,
                        tenant: true
                    }
                }
            },

            // Filter to get only categories that have at least one related record
            // where: {
            //     productTenantCategories: {
            //         id: Not(IsNull())
            //     }
            // },
            /*where: {
                productTenantCategories: {
                    product: {
                        tenant: {
                            type: TenantType.MARKET // اینجا از طریق product به tenant دسترسی پیدا می‌کنیم
                        }
                    }
                }
            },*/

            order: {createdAt: 'ASC'},
        } as any);

        // Manual Calculation: Add 'productCount' to children
        categories.forEach(category => {
            if (category.children && category.children.length > 0) {
                category.children.forEach(child => {
                    // حالا چون productTenantCategories را لود کردیم، طول آن را می‌گیریم
                    child.productCount = child.productTenantCategories ? child.productTenantCategories.length : 0;
                });
            }
        });

        return categories;
    }

}
