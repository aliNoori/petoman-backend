import {Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique} from "typeorm";
import {MarketProduct} from "../product/entities/product.entity";
import {User} from "../../../shared/user/entities/user.entity";
import {ProductVariant} from "../product/entities/product-variant.entity";

@Entity('product_reviews')
@Unique([
    'orderId',
    'productId',
    'variantId',
    'userId'
]) // نکته: این یونیک بودن orderId یعنی کاربر فقط می‌تواند برای یک سفارش یک نظر ثبت کند (اگر منطق چند محصول در یک سفارش را دارید ممکن است نیاز به تغییر داشته باشد)
export class ProductReview {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /** Tenant scope */
    @Column('uuid')
    tenantId: string;

    /** Product */
    @Column('uuid')
    productId: string;

    /** Product */
    @Column('uuid',{nullable:true})
    variantId: string;


    /** Order that proves purchase */
    @Column('uuid')
    orderId: string;

    /** Reviewer */
    @Column('uuid')
    userId: string;

    /** Rating 1 to 5 */
    @Column('int')
    rating: number;

    /** Review comment */
    @Column({ type: 'text', nullable: true })
    comment?: string;

    /** Review Title */
    @Column({ type: 'varchar', length: 255, nullable: true })
    title?: string;

    /** Pros (Advantages) - Stored as simple array in DB */
    @Column({ type: 'simple-array', nullable: true })
    pros?: string[];

    /** Cons (Disadvantages) - Stored as simple array in DB */
    @Column({ type: 'simple-array', nullable: true })
    cons?: string[];

    /** Moderation flag */
    @Column({ default: false })
    isApproved: boolean;

    @Column({ default: false })
    recommended: boolean;

    @Column({ type: 'int', default: 0 })
    likesCount: number;

    @Column({ type: 'int', default: 0 })
    dislikesCount: number;

    @Column({ type: 'simple-array', nullable: true })
    /** لیست آیدی کاربرانی که نظر را لایک کرده‌اند */
    likesByUsers: string[];

    @Column({ type: 'simple-array', nullable: true })
    /** لیست آیدی کاربرانی که نظر را دیسلایک کرده‌اند */
    dislikesByUsers: string[];

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => MarketProduct, (product) => product.reviews, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'productId' })
    marketProduct: MarketProduct;

    @ManyToOne(() => ProductVariant, (v) => v.reviews, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'variantId' })
    variant: ProductVariant;

    @ManyToOne(() => User, (user) => user.productReviews,{onDelete:'CASCADE'})
    @JoinColumn({ name: 'userId' })
    user: User;
}