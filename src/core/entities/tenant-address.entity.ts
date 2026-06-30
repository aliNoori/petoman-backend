import {
    Column,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
    OneToOne
} from "typeorm";
import { Tenant } from "./tenant.entity";

@Entity('tenant_addresses')
@Index(['tenantId'])
export class TenantAddress {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    tenantId: string;

    // --- فیلدهای عمومی آدرس ---

    @Column({ type: 'varchar', length: 100, nullable: true })
    title?: string; // عنوان دلخواه کاربر

    @Column({ type: 'text', nullable: true })
    fullAddress?: string; // آدرس خوانا (AddressString)

    @Column({ type: 'varchar', length: 100, nullable: true })
    province?: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    city?: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    receiver?: string; // نام مالک/مسئول

    @Column({ type: 'varchar', length: 20, nullable: true })
    phone?: string; // شماره تماس آدرس

    @Column({ type: 'varchar', length: 20, nullable: true })
    postalCode?: string; // کد پستی

    @Column({ type: 'boolean', default: false })
    isDefault: boolean;

    @Column({ type: 'json', nullable: true })
    location?: { lat: number; lng: number }; // مختصات جغرافیایی

    // --- فیلدهای تجزیه شده آدرس (از ساختار OSM) ---

    @Column({ type: 'varchar', length: 100, nullable: true })
    street?: string; // road

    @Column({ type: 'varchar', length: 100, nullable: true })
    neighborhood?: string; // neighbourhood

    @Column({ type: 'varchar', length: 100, nullable: true })
    district?: string; // district

    @Column({ type: 'varchar', length: 100, nullable: true })
    suburb?: string; // suburb

    @Column({ type: 'varchar', length: 100, nullable: true })
    county?: string; // county

    @Column({ type: 'varchar', length: 50, nullable: true })
    buildingNo?: string; // building/plot

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

    // ۱. تعریف رابطه OneToOne
    @OneToOne(() => Tenant, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;
}