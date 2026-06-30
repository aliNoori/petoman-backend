import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToMany,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn, OneToOne
} from 'typeorm';
import { TenantUser } from './tenant-user.entity';
import { TenantCapability } from './tenant-capability.entity';
import { ApiProperty } from '@nestjs/swagger';
import {MarketProduct} from "../../modules/market/product/entities/product.entity";
import {ShopReview} from "../../modules/market/review/shop-review.entity";
import {MarketSetting} from "../../modules/market/settings/market-setting.entity";
import {Order} from "../../shared/order/order.entity";
import {Wallet} from "../../shared/wallet/wallet.entity";
import {Appointment} from "../../modules/vet&clinic/entities/appointment.entity";
import {Withdrawal} from "../../modules/market/request/entities/withdrawal.entity";
import {BankCard} from "../../modules/market/account/bank-card.entity";
import {TenantSetting} from "../../shared/request/entities/tenant-setting.entity";
import {VetClinicServiceEntity} from "../../modules/vet&clinic/entities/service.entity";
import {TenantReview} from "../../shared/reviews/tenant-review.entity";
import {PharmacyMedicine} from "../../modules/pharmacy/medicine/pharmacy-medicine.entity";
import {UserAddress} from "../../shared/address/address.entity";
import {TenantAddress} from "./tenant-address.entity";
import {TenantSpecialty} from "./tenant-specialty.entity";


/** _Tenant entity_ Represents a business unit */
export enum TenantType {
    MARKET = 'MARKET',
    PHARMACY = 'PHARMACY',
    VET = 'VET',
    CLINIC = 'CLINIC',
}

export enum ConsultationServiceType {
    CHAT = 'CHAT',           // گفتگوی آنلاین
    PHONE_INSTANT = 'PHONE_INSTANT',   // تماس فوری
    PHONE_SCHEDULED = 'PHONE_SCHEDULED', // تماس زمان‌دار
}

export enum ServiceAvailabilityStatus {
    AVAILABLE = 'AVAILABLE',     // آزاد و آماده
    BUSY = 'BUSY',               // مشغول
    OFFLINE = 'OFFLINE',         // آفلاین
    QUEUE_FULL = 'QUEUE_FULL',   // صف پر است
}

@Entity('tenants')
export class Tenant {
    @ApiProperty({ example: 'uuid' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiProperty({ example: 'Super Pharmacy' })
    @Column({ length: 150 })
    name: string;

    @ApiProperty({ enum: TenantType })
    @Column({ type: 'enum', enum: TenantType })
    type: TenantType;

    // --- فیلدهای جدید برای صفحه کلینیک ---

    @ApiProperty({ example: 'جراحی عمومی و تخصصی' })
    @Column({ nullable: true })
    specialty?: string; // تخصص اصلی

    @ApiProperty({ example: 10 })
    @Column({ type: 'int', default: 0, nullable: true })
    experience?: number; // سال‌های تجربه

    @ApiProperty({ example: true })
    @Column({ default: false })
    isOnline: boolean; // آیا الان آنلاین است؟

    @Column({ type: 'simple-array', nullable: true })
    specialties?: string[]; // لیست تخصص‌ها (آرایه رشته‌ای)

    @ApiProperty({ example: 'active' })
    @Column({ default: 'active' })
    status: string;

    @ApiProperty({ example: 'uuid of owner user' })
    @Column()
    ownerUserId: string;

    // --- Shop Details Fields ---
    @ApiProperty({ required: false })
    @Column({ nullable: true })
    ownerName?: string;

    @ApiProperty({ required: false })
    @Column({ nullable: true })
    phone?: string;

    @ApiProperty({ required: false })
    @Column({ nullable: true })
    email?: string;

    @ApiProperty({ required: false })
    @Column({ type: 'text', nullable: true })
    address?: string;

    @ApiProperty({ required: false })
    @Column({ nullable: true })
    province?: string;

    @ApiProperty({ required: false })
    @Column({ nullable: true })
    city?: string;

    @ApiProperty({ required: false })
    @Column({ type: 'json', nullable: true })
    location?: { lat: number; lng: number }|null;

    @ApiProperty({ required: false })
    @Column({ type: 'simple-array', nullable: true })
    categories?: string[];

    @ApiProperty({ required: false })
    @Column({ type: 'simple-array', nullable: true })
    services?: string[];

    @Column({ type: 'text', nullable: true })
    description?: string;

    @ApiProperty({ required: false })
    @Column({ nullable: true })
    iban?: string;

    /**
     * Stores documents with metadata (thumbnail, name, type).
     * Structure: { logo: { thumbnail: string, name: string, type: string }, ... }
     */
    @Column({ type: 'jsonb', nullable: true })
    documents: {
        logo?: { thumbnail: string; name: string; type: string };
        license?: { thumbnail: string; name: string; type: string };
        nationalId?: { thumbnail: string; name: string; type: string };
    };

    @Column('decimal', { precision: 3, scale: 2, default: 0 })
    rating: number;

    @Column('int', { default: 0 })
    reviewsCount: number;

    /** True / False */
    @Column({ default: false })
    isOpen: boolean;

    /** True / False */
    /*@Column({ default: true })
    freeDelivery: boolean;*/

    /** True / False */
    @Column({ default: true })
    fastDelivery: boolean;

    @Column({ default: false })
    isSuspended: boolean;

    //@ApiProperty({ example: 1, description: 'حداکثر تعداد گفتگوی آنلاین همزمان' })
    @Column({ type: 'int', default: 1 })
    chatCapacity: number;

    //@ApiProperty({ example: 1, description: 'حداکثر تعداد تماس تلفنی فوری همزمان' })
    @Column({ type: 'int', default: 1 })
    phoneInstantCapacity: number;

    //@ApiProperty({ example: 1, description: 'حداکثر تعداد تماس تلفنی زمان‌دار همزمان' })
    @Column({ type: 'int', default: 1 })
    phoneScheduledCapacity: number;

    //@ApiProperty({ example: true, description: 'آیا سرویس گفتگوی آنلاین فعال است؟' })
    @Column({ default: true })
    chatEnabled: boolean;

    @Column({ default: 15 })
    chatDuration: number;


    //@ApiProperty({ example: true, description: 'آیا سرویس تماس فوری فعال است؟' })
    @Column({ default: true })
    phoneInstantEnabled: boolean;

    @Column({ default: 10 })
    phoneInstantDuration: number;

    //@ApiProperty({ example: true, description: 'آیا سرویس تماس زمان‌دار فعال است؟' })
    @Column({ default: true })
    phoneScheduledEnabled: boolean;

    @Column({ default: 15 })
    phoneScheduledDuration: number;

    @ApiProperty({ example: 15, description: 'مدت زمان پیش‌فرض هر مشاوره به دقیقه' })
    @Column({ type: 'int', default: 15 })
    defaultConsultationDuration: number;


    //@ApiProperty({ example: 30, description: 'حداکثر زمان انتظار در صف به دقیقه' })
    @Column({ type: 'int', default: 30 })
    maxQueueWaitTime: number;


    //@ApiProperty({ example: 10, description: 'حداکثر طول صف انتظار' })
    @Column({ type: 'int', default: 10 })
    maxQueueLength: number;


    //@ApiProperty({ description: 'زمان آخرین فعالیت' })
    @Column({ type: 'timestamp', nullable: true })
    lastActivityAt: Date | null;


    //@ApiProperty({ example: false, description: 'حالت مزاحم نشوید' })
    @Column({ default: false })
    doNotDisturb: boolean;


    //@ApiProperty({ description: 'تنظیمات پیشرفته ظرفیت' })
    @Column({ type: 'jsonb', nullable: true })
    capacitySettings: {

        chat?: {
            enabled?: boolean;           // فعال/غیرفعال
            maxConcurrent?: number;      // حداکثر همزمان
            maxQueue?: number;           // حداکثر صف
            autoAccept?: boolean;        // پذیرش خودکار
            estimatedDuration?: number;  // مدت تقریبی (دقیقه)
        };

        phoneInstant?: {
            enabled?: boolean;
            maxConcurrent?: number;
            maxQueue?: number;
            autoAccept?: boolean;
            estimatedDuration?: number;
            maxRingTime?: number;        // حداکثر زمان زنگ خوردن (ثانیه)
        };

        phoneScheduled?: {
            enabled?: boolean;
            maxConcurrent?: number;
            maxQueue?: number;
            estimatedDuration?: number;
        };
    } | null;


    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // --- Relations ---
    @OneToMany(() => TenantUser, (tenantUser) => tenantUser.tenant)
    tenantUsers: TenantUser[];

    @OneToMany(() => TenantCapability, (tc) => tc.tenant)
    tenantCapabilities: TenantCapability[];

    // --- Relation New: MarketProducts ---
    @OneToMany(() => MarketProduct, (product) => product.tenant)
    marketProducts: MarketProduct[];

    // --- Relation New: MarketProducts ---
    @OneToMany(() => PharmacyMedicine, (medicine) => medicine.tenant)
    pharmacyMedicines: PharmacyMedicine[];

    @OneToMany(() => ShopReview, (review) => review.tenant)
    reviews: ShopReview[];

    @OneToMany(() => TenantReview, (tenantReview) => tenantReview.tenant)
    tenantReviews: TenantReview[];

    @OneToMany(() => Order, (order) => order.tenant)
    orders: Order[];

    @Column({ nullable: true })
    walletId: string;

    // ۲. تعریف رابطه OneToOne
    @OneToOne(() => Wallet, (wallet) => wallet.tenant)
    wallet: Wallet;

    @OneToMany(() => MarketSetting, (setting) => setting.tenant)
    settings: MarketSetting[];

    @OneToMany(() => Appointment, (appointment) => appointment.tenant)
    appointments: Appointment[];

    @OneToMany(() => Withdrawal, (withdrawal) => withdrawal.tenant)
    withdrawals: Withdrawal[];

    @OneToMany(() => BankCard, (bankcard) => bankcard.tenant)
    bankcards: BankCard[];

    @OneToMany(() => TenantSetting, (tenantSetting) => tenantSetting.tenant)
    tenantSettings: TenantSetting[];

    @OneToMany(() => VetClinicServiceEntity, (tenantServices) => tenantServices.tenant)
    tenantServices: VetClinicServiceEntity[];

    // ۲. تعریف رابطه OneToOne
    @OneToOne(() => TenantAddress, (tenantAddress) => tenantAddress.tenant)
    tenantAddress: TenantAddress;

    @ManyToOne(() => TenantSpecialty, { nullable: true })
    @JoinColumn({ name: 'specialty' }) // این نام باید دقیقاً برابر با نام ستون در جدول tenants باشد
    tenantSpecialty?: TenantSpecialty;


}