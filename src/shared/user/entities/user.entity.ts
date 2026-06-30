import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToOne, OneToMany, ManyToOne, JoinColumn, ManyToMany, JoinTable,
} from 'typeorm';
import { Supporter} from "../../../modules/supporter/public-supporters/supporter.entity";
import {IsOptional, IsString} from "class-validator";
import {Notification} from "../../notification/notification.entity";
import {Post} from "../../../modules/Danim/post/post.entity";
import {PostLike} from "../../../modules/Danim/post/post-like.entity";
import {MediaWatchList} from "../../../modules/film/content/film-watch-list.entity";
import {MediaFavorite} from "../../../modules/film/content/film-favorite.entity";
import {UserSetting} from "./user-setting.entity";
import {Exclude} from "class-transformer";
import {TenantUser} from "../../../core/entities/tenant-user.entity";
import {ApiProperty} from "@nestjs/swagger";
import {Role} from "../../../core/entities/role.entity";
import {ShopReview} from "../../../modules/market/review/shop-review.entity";
import {ProductReview} from "../../../modules/market/review/product-review.entity";
import {Order} from "../../order/order.entity";
import {UserAddress} from "../../address/address.entity";
import {Discount} from "../../discount/discount.entity";
import {Wallet} from "../../wallet/wallet.entity";
import {Pet} from "../../../modules/vet&clinic/entities/pet.entity";
import {Appointment} from "../../../modules/vet&clinic/entities/appointment.entity";
import {TenantReview} from "../../reviews/tenant-review.entity";

export enum UserRole {
    //USER = 'user',
    SUBSCRIBER='subscriber',
    ADMIN = 'admin',
    SUPPORTER_ADMIN = 'supporter_admin',
    HAMIAN_SUBSCRIBER='hamian_subscriber',
    SUPPORTER_SUBSCRIBER = 'supporter_subscriber',
    DANIM_ADMIN = 'danim_admin',
    DANIM_SUBSCRIBER='danim_subscriber',
    FILM_ADMIN = 'film_admin',
    FILM_SUBSCRIBER='film_subscriber',
    MARKET_ADMIN = 'market_admin',
    MARKET_SUBSCRIBER='market_subscriber',
    VET_ADMIN = 'vet_admin',
    VET_SUBSCRIBER='vet_subscriber',
    DANIM_EDITOR='danim_editor',
    DANIM_AUTHOR='danim_author',


}

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({nullable: true , length: 100 })
    fullName: string;

    @Column({nullable: true , length: 100 })
    firstName: string;

    @Column({nullable: true , length: 100 })
    lastName: string;

    @IsOptional()
    @Column({ nullable: true ,unique: true})
    username: string;

    @Column({default:null, unique: true })
    email: string;

    @Column({ default: false })
    isVerified: boolean;

    @UpdateDateColumn()
    phoneVerifiedAt?: Date;

    @Column({ nullable: true, unique: true })
    phoneNumber: string;


    @Column()
    @Exclude()
    password: string;


    @Column({default:''})
    @Exclude()
    code: string;

    @Column({ nullable: true })
    avatar?: string;

    @Column({ nullable: true })
    bio?: string;

    @Column({ nullable: true })
    fcm_token?:string

    @Column({ default: true })
    isActive: boolean;

    @Column({ default: false })
    isBlocked: boolean;

    @Column({ default: null })
    blockReason: string;

    @Column({ type: 'date', nullable: true })
    dateOfBirth?: Date;

    @Column({ default: false })
    isOnline: boolean;

    @Column({ type: 'timestamp', nullable: true })
    lastSeen?: Date|null;

    @Column({ type: 'jsonb', nullable: true, default: [] })
    legacyRoles: UserRole[];

    @ManyToMany(() => Role, (role) => role.users) // اگر در Role هم users دارید
    @JoinTable({
        name: 'user_roles',
        joinColumn: { name: 'userId', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'roleId', referencedColumnName: 'id' }
    })
    roles: Role[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    lastLogin?: Date | null;

    @OneToOne(() => UserSetting, settings => settings.user, {
        cascade: true,
    })
    settings: UserSetting

    @OneToOne(() => Supporter, (supporter) => supporter.user)
    supporterProfile: Supporter;

    @OneToMany(() => Notification, (notification) => notification.user)
    notifications: Notification[];

    @OneToMany(() => Post, post => post.author)
    posts: Post[];

    @OneToMany(() => PostLike, like => like.user)
    likesRelations: PostLike[];

    @OneToMany(() => MediaWatchList, watchList => watchList.user)
    watchListsRelations: MediaWatchList[];

    @OneToMany(() => MediaFavorite, favorite => favorite.user)
    favoritesRelations: MediaFavorite[];

    ///For tenant
    @OneToMany(() => TenantUser, (tenantUser) => tenantUser.user)
    tenantUsers: TenantUser[];

    @OneToMany(() => ShopReview, (review) => review.user)
    shopeReviews: ShopReview[];

    @OneToMany(() => TenantReview, (review) => review.user)
    tenantReviews: TenantReview[];

    @OneToMany(() => ProductReview, (review) => review.user)
    productReviews: ProductReview[];

    @OneToMany(() => Order, order => order.user)
    orders: Order[];

    @OneToMany(() => UserAddress, a => a.user)
    @JoinColumn({ name: 'addressId' })
    addresses: UserAddress[];

    // --- اضافه شده: متد دریافت آدرس پیش‌فرض از لیست ---
    get defaultAddress(): UserAddress | undefined {
        // اگر لیست آدرس‌ها خالی نباشد، اولین آدرسی که isDefault آن true است را برمی‌گرداند
        if (this.addresses && this.addresses.length > 0) {
            return this.addresses.find(addr => addr.isDefault);
        }
        return undefined;
    }

    @OneToMany(() => Discount, (discount) => discount.user)
    discounts: Discount[];

    @OneToMany(() => Wallet, (wallet) => wallet.user)
    wallets: Wallet[];

    @OneToMany(() => Pet, (pet) => pet.owner)
    pets: Pet[];

    @OneToMany(() => Appointment, (appointment) => appointment.user)
    myAppointments: Appointment[];

    // اگر کاربر دامپزشک است و نوبت‌های او را می‌خواهیم:
    @OneToMany(() => Appointment, (appointment) => appointment.doctor)
    doctorAppointments: Appointment[];


}