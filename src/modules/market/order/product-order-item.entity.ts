import {Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import {Order} from "../../../shared/order/order.entity";
import {MarketProduct} from "../product/entities/product.entity";
import {ProductVariant} from "../product/entities/product-variant.entity";
import {PharmacyMedicine} from "../../pharmacy/medicine/pharmacy-medicine.entity";

@Entity('product_order_items')
@Index(['orderId'])
export class ProductOrderItem {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    orderId: string;

    @Column('uuid',{nullable:true})
    productId?: string;

    @Column('uuid',{nullable:true})
    variantId?: string;

    @Column('uuid',{nullable:true})
    medicineId?: string;

    /** Snapshot price */
    @Column('int')
    price: number;

    /** Quantity */
    @Column('int')
    quantity: number;

    @ManyToOne(() => Order, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'orderId' })
    order: Order;

    @ManyToOne(() => MarketProduct, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'productId' })
    marketProduct: MarketProduct;

    @ManyToOne(() => PharmacyMedicine, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'medicineId' })
    pharmacyMedicine: PharmacyMedicine;

    @ManyToOne(() => ProductVariant, { nullable: true, eager: false })
    @JoinColumn({ name: 'variantId' })
    variant?: ProductVariant;
}
