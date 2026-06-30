import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, CreateDateColumn } from 'typeorm';
import { User } from '../../../../shared/user/entities/user.entity'; // مسیر یوزر شما
import { MarketProduct} from "./product.entity";

@Entity('product_likes')
@Index(['userId', 'productId'], { unique: true }) // جلوگیری از لایک تکراری توسط یک کاربر
export class ProductLike {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    userId: string;

    @Column('uuid')
    productId: string;

    @Column({ type: 'boolean', default: true }) // true = like, false = dislike
    isLike: boolean;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @ManyToOne(() => MarketProduct)
    @JoinColumn({ name: 'productId' })
    product: MarketProduct;

    @CreateDateColumn()
    createdAt: Date;
}