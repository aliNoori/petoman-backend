// product.entity.ts
import {
    Column,
    CreateDateColumn,
    Entity, JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from "typeorm";
import {MarketProduct} from "../../modules/market/product/entities/product.entity";
import {Brand} from "../refrences/entities/brand.entity";
import {TenantCategory} from "../../modules/market/category/tenant-category.entity";

export enum ProductStatus {
    PENDING = 'pending',
    REJECTED = 'rejected',
    NEEDS_REVISION='needs_revision',
    APPROVED='approved'
}

@Entity('products')
export class Product {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /** Tenant ownership */
    @Column('uuid')
    tenantId: string;

    @Column('uuid',{nullable:true})
    createdBy:string

    @Column()
    name: string;

    /*@Column({ type: 'text', nullable: true })
    description: string;*/

    @Column({ nullable: true })
    image: string;

    @Column({ type: 'simple-array', nullable: true })
    galleryImages: string[];

    @ManyToOne(() => Brand, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'brandId' })
    brand: Brand;

    @Column({ nullable: true })
    brandId: string;

    @Column({default:null})
    code: string;

    /** Product category */
    @Column({default:null})
    categoryBreadcrumb: string;



    /*/!** Product category *!/
    @Column({default:null})
    category: string;*/

    @ManyToOne(() => TenantCategory, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'categoryId' })
    category: TenantCategory;

    /** Product categoryId */
    @Column({type:'uuid',default:null})
    categoryId: string;

    /** Product categoryIds */
    @Column({ type: 'uuid', array: true, default:null })
    categoryIds?: string[];

    @Column({ default: null })
    type: string; // فیلد مشترک (مثل 'shop', 'medicine')

    /** Audit fields */
    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.PENDING })
    status: ProductStatus;

    @OneToMany(() => MarketProduct, tp => tp.product,{onDelete:'CASCADE'})
    marketProducts: MarketProduct[];

    @Column({default:''})
    rejectionReason?: string;
}