import {
    Column,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
    ManyToOne, JoinColumn
} from "typeorm";
import {ShopReview} from "../review/shop-review.entity";
import {Tenant} from "../../../core/entities/tenant.entity";

@Entity('market_settings')
@Index(['tenantId', 'key']) // Index for fast lookup by tenant and key
export class MarketSetting {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    tenantId: string;

    /** The setting key (e.g., 'shop_info', 'shipping_methods') */
    @Column({ type: 'varchar', length: 100 })
    key: string;

    /** The setting value stored as JSON string */
    @Column({ type: 'json' })
    value: any;

    @ManyToOne(() => Tenant, (tenant) => tenant.settings)
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}