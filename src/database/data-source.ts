import {DataSource} from 'typeorm';
import {Category} from "../shared/category/category.entity";
import {CategoryTypeEntity} from "../shared/category/category-type.entity";
import {Post} from '../modules/Danim/post/post.entity'
import {Tag} from "../shared/tag/tag.entity";
import {Movie} from "../modules/film/content/movie/movie.entity";
import {TagType} from "../shared/tag/tag-type.entity";
import {FilmPost} from "../modules/film/post/post.entity";
import {Series} from "../modules/film/content/series/entities/series.entity";
import {Season} from "../modules/film/content/series/entities/season.entity";
import {Episode} from "../modules/film/content/series/entities/episode.entity";
import {Faq} from "../shared/faq/faq.entity";
import {FaqType} from "../shared/faq/faq-type.entity";
import {Role} from "../core/entities/role.entity";
import {Permission} from "../core/entities/permission.entity";
import {Capability} from "../core/entities/capability.entity";
import {RolePermission} from "../core/entities/role-permission.entity";
import {User} from "../shared/user/entities/user.entity";
import {Upload} from "../shared/upload/upload.entity";
import {Message} from "../socket/message/message.entity";
import {Notification} from "../shared/notification/notification.entity";
import {OtpCode} from "../shared/gateways/sms/entities/otp-code.entity";
import {Documentary} from "../modules/supporter/documentation/documentary.entity";
import {Donation} from "../modules/supporter/donation/donation.entity";
import {KindnessMeeting} from "../modules/supporter/kindness-meeting/kindness-meeting.entity";
import {Page} from "../modules/supporter/page-builder/page.entity";
import {Supporter} from "../modules/supporter/public-supporters/supporter.entity";
import {RequestSupporter} from "../modules/supporter/requests/request-supporter.entity";
import {AppearanceSetting} from "../modules/supporter/setting/appearance/appearance-setting.entity";
import {GeneralSetting} from "../modules/supporter/setting/general/general-setting.entity";
import {OpenGraphSetting} from "../modules/supporter/setting/open-graph/open-graph-setting.entity";
import {PaymentSetting} from "../modules/supporter/setting/payment/payment-setting.entity";
import {SchemaSetting} from "../modules/supporter/setting/schema/schema-setting.entity";
import {SeoSetting} from "../modules/supporter/setting/seo/seo-setting.entity";
import {PostLike} from "../modules/Danim/post/post-like.entity";
import {PostBookmark} from "../modules/Danim/post/post-bookmark.entity";
import {DanimPage} from "../modules/Danim/page/page.entity";
import {DanimGeneralSetting} from "../modules/Danim/setting/general/general-setting.entity";
import {DanimSeoSetting} from "../modules/Danim/setting/seo/seo-setting.entity";
import {DanimOpenGraphSetting} from "../modules/Danim/setting/open-graph/open-graph-setting.entity";
import {DanimSchemaSetting} from "../modules/Danim/setting/schema/schema-setting.entity";
import {DanimHomePageSetting} from "../modules/Danim/setting/home-page/home-page.enitity";
import {DanimPerformanceSetting} from "../modules/Danim/setting/performance/performance-setting.entity";
import {FilmPage} from "../modules/film/page/page.entity";
import {Comment} from "../modules/film/comment/comment.entity";
import {FilmGeneralSetting} from "../modules/film/setting/general/entities/general-setting.entity";
import {FilmAdvanceSetting} from "../modules/film/setting/general/entities/advance-setting.entity";
import {ReportEntity} from "../modules/film/report/report.entity";
import {FilmSeoSetting} from "../modules/film/setting/general/entities/seo-setting.entity";
import {
    KindnessMeetingRegistration
} from "../modules/supporter/requests/kindness-meeting/kindness-meeting-registration.entity";
import {FilmApiSetting} from "../modules/film/setting/general/entities/api-setting.entity";
import {Order} from "../shared/order/order.entity";
import {Transaction} from "../shared/transaction/transaction.entity";
import {UserSetting} from "../shared/user/entities/user-setting.entity";
import {FilmSocialSetting} from "../modules/film/setting/general/entities/social-setting.entity";
import {MediaFavorite} from "../modules/film/content/film-favorite.entity";
import {MediaWatchList} from "../modules/film/content/film-watch-list.entity";
import {MediaWatched} from "../modules/film/content/media-watched.entity";
import {FilmOpengraphSetting} from "../modules/film/setting/general/entities/opengraph-setting.entity";
import {Tenant} from "../core/entities/tenant.entity";
import {TenantCapability} from "../core/entities/tenant-capability.entity";
import {TenantUser} from "../core/entities/tenant-user.entity";
import {MarketProduct} from "../modules/market/product/entities/product.entity";
import {TenantCategory} from "../modules/market/category/tenant-category.entity";
import {ProductTenantCategory} from "../modules/market/product/entities/product-category.entity";
import {ProductOrderItem} from "../modules/market/order/product-order-item.entity";
import {Payment} from "../shared/gateways/payments/payment.entity";
import {Wallet} from "../shared/wallet/wallet.entity";
import {ProductReview} from "../modules/market/review/product-review.entity";
import {Animal} from "../shared/refrences/entities/animal.entity";
import {Brand} from "../shared/refrences/entities/brand.entity";
import {Attribute} from "../shared/refrences/entities/attribute.entity";
import {Product} from "../shared/product/product.entity";
import {ShopReview} from "../modules/market/review/shop-review.entity";
import {ShopRequest} from "../modules/market/user/shops/shop-request.entity";
import {UserAddress} from "../shared/address/address.entity";
import {TenantAccess} from "../core/entities/tenant-access.entity";
import {MarketSetting} from "../modules/market/settings/market-setting.entity";
import {ProductFeature} from "../modules/market/product/entities/product-feature.entity";
import {ProductVariant} from "../modules/market/product/entities/product-variant.entity";
import {ProductSpecification} from "../modules/market/product/entities/product-specification.entity";
import {WalletTransaction} from "../shared/wallet/wallet-transaction.entity";
import {Discount} from "../shared/discount/discount.entity";
import {Session} from "../shared/user/entities/session.entity";
import {Ticket} from "../shared/ticket/ticket.entity";
import {TicketMessage} from "../shared/ticket/ticket-messages.entity";
import {PendingShopInfoChange} from "../modules/market/settings/pending-shop-info-change.entity";
import {Withdrawal} from "../modules/market/request/entities/withdrawal.entity";
import {BankCard} from "../modules/market/account/bank-card.entity";
import {ProductLike} from "../modules/market/product/entities/product-like.entity";
import {Consultation} from "../socket/consultation/consultation.entity";
import {Appointment} from "../modules/vet&clinic/entities/appointment.entity";
import {Pet} from "../modules/vet&clinic/entities/pet.entity";
import {TenantRequest} from "../shared/request/entities/tenant-request.entity";
import {TenantSetting} from "../shared/request/entities/tenant-setting.entity";
import {TimeOffBlock} from "../modules/vet&clinic/entities/time-off.entity";
import {TenantSettingChangeRequest} from "../shared/request/entities/tenant-setting-change-request.entity";
import {VetClinicServiceEntity} from "../modules/vet&clinic/entities/service.entity";
import {TenantReview} from "../shared/reviews/tenant-review.entity";
import {PharmacyMedicine} from "../modules/pharmacy/medicine/pharmacy-medicine.entity";
import {Medicine} from "../shared/medicine/medicine.entity";
import {AdminSetting} from "../shared/settings/admin-settings-entity";
import {AdminFaq} from "../shared/faqs/entities/admin-faqs.entity";
import {AdminFaqCategory} from "../shared/faqs/entities/admin-faqs-category.entity";
import {ActivityLog} from "../shared/activities/activity-log.entity";
import {TenantSpecialty} from "../core/entities/tenant-specialty.entity";
import {ClinicService} from "../modules/vet&clinic/entities/clinic-service.entity";
import {TenantAddress} from "../core/entities/tenant-address.entity";

export const AppDataSource = new DataSource({
    // type: 'postgres',
    // host: 'localhost',
    // port: 5432,
    // username: 'postgres',
    // password: 'ame@6558U',
    // database: 'petoman',
    type: 'postgres',
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT),
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    entities: [
        User, Upload, UserAddress,
        Message, Notification, OtpCode,
        Tag, TagType, DanimPage,
        Category, CategoryTypeEntity,
        Faq, FaqType,
        Documentary,
        Page, Supporter, RequestSupporter, KindnessMeetingRegistration, KindnessMeeting, Donation,
        Post, PostLike, PostBookmark,
        GeneralSetting, SeoSetting, AppearanceSetting, OpenGraphSetting, PaymentSetting, SchemaSetting,
        //Danim
        DanimGeneralSetting, DanimSeoSetting, DanimOpenGraphSetting, DanimSchemaSetting, DanimHomePageSetting, DanimPerformanceSetting,
        //Film
        Movie, Series, Season, Episode, FilmPage, FilmPost, Comment, ReportEntity, MediaFavorite, MediaWatchList, MediaWatched,
        FilmOpengraphSetting, FilmSocialSetting, FilmApiSetting, FilmSeoSetting, FilmGeneralSetting, FilmAdvanceSetting,
        //////////////////////////////////TENANTS========////
        UserSetting,
        Permission, Role, RolePermission,
        //Tenant
        Tenant, Capability, TenantCapability,TenantSpecialty, TenantUser, TenantCategory, TenantAccess,
        //Product
        Product, MarketProduct, ProductLike, MarketSetting, ProductTenantCategory, ProductOrderItem, ProductReview, ShopReview,
        ProductFeature, ProductVariant, ProductSpecification,
        //Payment
        Payment, Wallet, Order, Transaction, WalletTransaction,
        //Reference
        Animal, Brand, Attribute,
        //
        ShopRequest, Discount, Session,
        //
        Ticket, TicketMessage, PendingShopInfoChange,
        //
        Withdrawal, BankCard, Consultation,
        //
        Appointment, Pet, TenantRequest, TenantSetting, TimeOffBlock,ClinicService,TenantAddress,
        TenantSettingChangeRequest, VetClinicServiceEntity, TenantReview,

        //
        PharmacyMedicine, Medicine, AdminSetting, AdminFaq, AdminFaqCategory, ActivityLog],
    synchronize: false,
});