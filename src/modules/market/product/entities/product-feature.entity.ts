import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { MarketProduct} from "./product.entity";

@Entity('product_features')
export class ProductFeature {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('text')
    text: string;

    @Column({ type: 'int', default: 0 })
    sortOrder: number;

    @ManyToOne(() => MarketProduct, (mp) => mp.features, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'marketProductId' })
    marketProduct: MarketProduct;

    @Column('uuid')
    marketProductId: string;
}