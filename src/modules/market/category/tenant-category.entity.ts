import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    Index,
    CreateDateColumn,
    UpdateDateColumn, OneToMany, ManyToOne, JoinColumn,
} from 'typeorm';
import {ProductTenantCategory} from "../product/entities/product-category.entity";
import {Product} from "../../../shared/product/product.entity";

@Entity('tenant_categories')
@Index(['tenantId'])
export class TenantCategory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /** Tenant ownership */
    @Column('uuid')
    tenantId: string;

    /** Category title */
    @Column()
    title: string;

    /** Category slug */
    @Column({ unique: true})
    slug: string;

    /** Category icon */
    @Column()
    icon: string;

    /** Category bgColor */
    @Column()
    bgColor: string;

    /** Category iconColor */
    @Column()
    iconColor: string;

    /** Optional parent category (for tree structure) */
    @Column('uuid', { nullable: true })
    parentId?: string|null;

    /** Visibility status */
    @Column({ default: true })
    isActive: boolean;

    @OneToMany(() => ProductTenantCategory, (ptc) => ptc.category)
    productTenantCategories: ProductTenantCategory[];

    @OneToMany(() => Product, (mp) => mp.category) //
    products: Product[];

    @ManyToOne(() => TenantCategory, { nullable: true })
    @JoinColumn({ name: 'parentId' })
    parent: TenantCategory | null;

    @OneToMany(() => TenantCategory, (category) => category.parent)
    children: TenantCategory[];

    @Column({ default: 0 })
    productCount: number;

    /** Audit fields */
    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
