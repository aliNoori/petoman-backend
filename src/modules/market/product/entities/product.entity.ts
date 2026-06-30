import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    Index,
    CreateDateColumn,
    UpdateDateColumn, ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import {DiscountType} from "../dto/create-product.dto";
import {Product} from "../../../../shared/product/product.entity";
import {Tenant} from "../../../../core/entities/tenant.entity";
import {ProductReview} from "../../review/product-review.entity";
import {ProductTenantCategory} from "./product-category.entity";
import {ProductVariant} from "./product-variant.entity";
import {ProductFeature} from "./product-feature.entity";
import {ProductSpecification} from "./product-specification.entity";

export enum MarketProductStatus {
    PENDING = 'pending',
    REJECTED = 'rejected',
    NEEDS_REVISION='needs_revision',
    APPROVED='approved',
    EDITED='edited'
}

@Entity('market_products')
@Index(['tenantId'])
export class MarketProduct {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /** Tenant ownership */
    @Column('uuid')
    tenantId: string;

    @Column('uuid',{nullable:true})
    updatedBy:string

    @Column('uuid',{nullable:true})
    createdBy:string

    /** Price (stored as integer - cents) */
    @Column('int')
    price: number;

    @Column({ type: 'text', nullable: true })
    description: string;

    /** DiscountPrice (stored as integer - cents) */
    @Column({type:'int',default:0})
    discountedPrice: number;

    /** DiscountValue (stored as integer - cents) */
    @Column({type:'int',default:0})
    discountValue: number;

    /** DiscountType */
    @Column({ type: 'enum', enum: DiscountType, default: DiscountType.PERCENTAGE })
    discountType: DiscountType;


    /** HasDiscount */
    @Column({type:'boolean',default:false})
    hasDiscount?: boolean;

    /** HasExpiryDate */
    @Column({type:'boolean',default:false})
    hasExpiryDate?: boolean;

    /** Stock quantity */
    @Column('int', { default: 0 })
    stock: number;

    /** Active / inactive */
    @Column({ default: false })
    isActive: boolean;

    @Column({type:'boolean',default:false})
    isFavorite?: boolean;

    @Column('decimal', { precision: 3, scale: 2, default: 0 })
    averageRating: number;

    @Column('int', { default: 0 })
    reviews_count: number;

    @Column('decimal', { precision: 3, scale: 2, default: 0 })
    average_rating: number;

    @Column('int', { default: 0 })
    reviewsCount: number;


    /** Audit fields */
    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({default:null})
    expiryDate?: string;

    @Column({default:null})
    discountStartDate?:string

    @Column({default:null})
    discountEndDate?:string

    @Column({ type: 'enum', enum: MarketProductStatus, default: MarketProductStatus.PENDING })
    status: MarketProductStatus;


    @ManyToOne(() => Product, { onDelete: 'CASCADE' })
    @JoinColumn()
    product: Product;

    /** Reference to the global product */
    @Column('uuid')
    productId: string;

    // ارتباط با Tenant (مالک محصول)
    @ManyToOne(() => Tenant, (tenant) => tenant.marketProducts, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;

    @OneToMany(() => ProductReview, (review) => review.marketProduct)
    reviews: ProductReview[];

    @OneToMany(() => ProductTenantCategory, (ptc) => ptc.product)
    productTenantCategories: ProductTenantCategory[];

    @OneToMany(() => ProductVariant, (variant) => variant.marketProduct)

    variants: ProductVariant[];

    @OneToMany(() => ProductFeature,(feature) => feature.marketProduct)
    features: ProductFeature[];

    @OneToMany(() => ProductSpecification,(specification) => specification.marketProduct)
    specifications: ProductSpecification[];

    @Column({default:''})
    rejectionReason?: string;
}