import {
    Column,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn, OneToMany, OneToOne
} from "typeorm";
import { User} from "../user/entities/user.entity";
import {Order} from "../order/order.entity";

@Entity('user_addresses')
@Index(['userId'])
export class UserAddress {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    userId: string;

    /** Address title like 'Home', 'Office' */
    @Column({ type: 'varchar', length: 50 })
    title: string;

    @Column({ type: "json", nullable: true })
    fullAddress: any;

    @Column({ type: 'varchar', length: 50 })
    province: string;

    @Column({ type: 'varchar', length: 50 })
    city: string;

    /** Receiver's full name */
    @Column({ type: 'varchar', length: 100 })
    receiver: string;

    /** Receiver's phone number */
    @Column({ type: 'varchar', length: 20 })
    phone: string;

    /** Postal code (optional) */
    @Column({ type: 'varchar', length: 20, nullable: true })
    postalCode?: string;

    /** plaque code (optional) */
    @Column({ type: 'varchar', length: 20, nullable: true })
    plaque?: string;

    /** unit code (optional) */
    @Column({ type: 'varchar', length: 20, nullable: true })
    unit?: string;

    /** Is this the default address? */
    @Column({ type: 'boolean', default: false })
    isDefault: boolean;

    /** Geographic coordinates (optional) */
    @Column({ type: 'json', nullable: true })
    location?: {
        lat: number;
        lng: number;
    };

    // --- فیلدهای جدید اضافه شده ---

    /** Street / Road Name */
    @Column({ type: 'varchar', length: 100, nullable: true })
    street?: string;

    /** Neighborhood */
    @Column({ type: 'varchar', length: 100, nullable: true })
    neighborhood?: string;

    /** District */
    @Column({ type: 'varchar', length: 100, nullable: true })
    district?: string;

    /** Suburb / Region */
    @Column({ type: 'varchar', length: 100, nullable: true })
    suburb?: string;

    /** County */
    @Column({ type: 'varchar', length: 100, nullable: true })
    county?: string;

    /** Building Number / Unit Number (پلاک و واحد) */
    @Column({ type: 'varchar', length: 50, nullable: true })
    buildingNo?: string;

    // --- فیلدهای اختصاصی OSM/Maps API ---

    @Column({ type: 'text', nullable: true })
    displayName?: string; // display_name

    @Column({ type: 'varchar', length: 50, nullable: true })
    placeId?: string; // place_id

    @Column({ type: 'varchar', length: 20, nullable: true })
    osmType?: string; // osm_type (relation, way, node)

    @Column({ type: 'varchar', length: 50, nullable: true })
    osmId?: string; // osm_id

    @Column({ type: 'varchar', length: 50, nullable: true })
    mapClass?: string; // class (tourism, highway, ...)

    @Column({ type: 'varchar', length: 50, nullable: true })
    mapType?: string; // type (attraction, residential, ...)

    @Column({ type: 'smallint', nullable: true })
    placeRank?: number; // place_rank

    @Column({ type: 'float', nullable: true })
    importance?: number; // importance score

    @Column({ type: 'json', nullable: true })
    boundingBox?: number[]; // boundingbox [minLat, maxLat, minLon, maxLon]

    @Column({ type: 'json', nullable: true })
    detailedAddress?: any; // ذخیره کل آبجکت address درون address (برای حفظ ساختار کامل)


    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    /** Relation with User */
    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @OneToMany(() => Order, o => o.address)
    @JoinColumn({ name: 'orderId' })
    order: Order;
}