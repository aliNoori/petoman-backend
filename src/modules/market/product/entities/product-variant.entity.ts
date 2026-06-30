import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany} from 'typeorm';
import { MarketProduct} from "./product.entity";
import {ProductReview} from "../../review/product-review.entity";

@Entity('product_variants')
export class ProductVariant {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid',{nullable:true})
    updatedBy:string

    @Column('uuid',{nullable:true})
    createdBy:string

    @Column()
    name: string; // e.g., "Red - Size L"

    // Variant attributes (can be JSON or separate columns)
    @Column({ type: 'json', nullable: true })
    attributes: Record<string, string>; // e.g., { "color": "red", "size": "L" }

    @Column('int', { default: 0 })
    price: number; // Specific price for this variant (if different from the main product)

    @Column('int', { default: 0 })
    stock: number; // Specific stock for this variant

    @Column({ default: true })
    isActive: boolean;

    @Column({default:null})
    image?: string;

    @ManyToOne(() => MarketProduct, (mp) => mp.variants, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'marketProductId' })
    marketProduct: MarketProduct;

    @Column('uuid')
    marketProductId: string;

    @OneToMany(() => ProductReview, (review) => review.variant)
    reviews: ProductReview[];
}