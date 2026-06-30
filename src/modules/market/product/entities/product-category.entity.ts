import {Entity, Column, PrimaryGeneratedColumn, Index, ManyToOne, JoinColumn} from 'typeorm';
import {MarketProduct} from "./product.entity";
import {Tenant} from "../../../../core/entities/tenant.entity";
import {TenantCategory} from "../../category/tenant-category.entity";

@Entity('product_tenant_categories')
@Index(['productId', 'categoryId'], { unique: true })
export class ProductTenantCategory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    productId: string;

    @Column('uuid')
    categoryId: string;

    @ManyToOne(() => MarketProduct, (product) => product.productTenantCategories,{onDelete:'CASCADE'})
    @JoinColumn({ name: 'productId' })
    product: MarketProduct;

    @ManyToOne(() => TenantCategory, (category) => category.productTenantCategories,{onDelete:'CASCADE'})
    @JoinColumn({ name: 'categoryId' })
    category: TenantCategory;
}
