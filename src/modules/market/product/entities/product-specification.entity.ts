import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { MarketProduct} from "./product.entity";

@Entity('product_specifications')
export class ProductSpecification {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    label: string; // title:'وزن'

    @Column('text')
    value: string; // مقدار: "2 کیلوگرم"

    @ManyToOne(() => MarketProduct, (mp) => mp.specifications, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'marketProductId' })
    marketProduct: MarketProduct;

    @Column('uuid')
    marketProductId: string;
}