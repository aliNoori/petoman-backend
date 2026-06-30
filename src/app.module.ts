import {MiddlewareConsumer, Module, RequestMethod} from '@nestjs/common';
import {AppService} from './app.service';
import {UserModule} from "./shared/user/user.module";
import {AuthModule} from "./shared/auth/auth.module";
import {User} from "./shared/user/entities/user.entity";
import {TypeOrmModule} from "@nestjs/typeorm";
import {ConfigModule} from "@nestjs/config";
import {Message} from "./socket/message/message.entity";
import {MessageModule} from './socket/message/message.module';
import {JwtModule} from "@nestjs/jwt";
import {SupporterModule} from "./modules/supporter/supporter.modules";
import {Faq} from "./shared/faq/faq.entity";
import {Documentary} from "./modules/supporter/documentation/documentary.entity";
import {Donation} from "./modules/supporter/donation/donation.entity";
import {KindnessMeeting} from "./modules/supporter/kindness-meeting/kindness-meeting.entity";
import {Page} from "./modules/supporter/page-builder/page.entity";
import {Supporter} from "./modules/supporter/public-supporters/supporter.entity";
import {AppearanceSetting} from "./modules/supporter/setting/appearance/appearance-setting.entity";
import {GeneralSetting} from "./modules/supporter/setting/general/general-setting.entity";
import {OpenGraphSetting} from "./modules/supporter/setting/open-graph/open-graph-setting.entity";
import {PaymentSetting} from "./modules/supporter/setting/payment/payment-setting.entity";
import {SchemaSetting} from "./modules/supporter/setting/schema/schema-setting.entity";
import {SeoSetting} from "./modules/supporter/setting/seo/seo-setting.entity";
import {CategoryModule} from "./shared/category/category.module";
import {Category} from "./shared/category/category.entity";
import {CategoryTypeEntity} from "./shared/category/category-type.entity";
import {UploadModule} from "./shared/upload/upload.module";
import {Upload} from "./shared/upload/upload.entity";
import {Post} from "./modules/Danim/post/post.entity";
import {DanimModule} from "./modules/Danim/danim.modules";
import {TagModule} from "./shared/tag/tag.module";
import {Tag} from "./shared/tag/tag.entity";
import {DanimPage} from "./modules/Danim/page/page.entity";
import {DanimGeneralSetting} from "./modules/Danim/setting/general/general-setting.entity";
import {DanimSeoSetting} from "./modules/Danim/setting/seo/seo-setting.entity";
import {DanimOpenGraphSetting} from "./modules/Danim/setting/open-graph/open-graph-setting.entity";
import {DanimSchemaSetting} from "./modules/Danim/setting/schema/schema-setting.entity";
import {AccessControlModule} from "nest-access-control";
import {roles} from "./shared/auth/guards/roles";
import {DanimHomePageSetting} from "./modules/Danim/setting/home-page/home-page.enitity";
import {DanimPerformanceSetting} from "./modules/Danim/setting/performance/performance-setting.entity";
import {AppController} from "./app.controller";
import {Notification} from "./shared/notification/notification.entity";
import {NotificationModule} from "./shared/notification/notification.module";
import {FilmModule} from "./modules/film/film.module";
import {Movie} from "./modules/film/content/movie/movie.entity";
import {TagType} from "./shared/tag/tag-type.entity";
import {Series} from "./modules/film/content/series/entities/series.entity";
import {Season} from "./modules/film/content/series/entities/season.entity";
import {Episode} from "./modules/film/content/series/entities/episode.entity";
import {FaqType} from "./shared/faq/faq-type.entity";
import {FaqModule} from "./shared/faq/faq.module";
import {FilmPage} from "./modules/film/page/page.entity";
import {FilmPost} from "./modules/film/post/post.entity";
import {Comment} from "./modules/film/comment/comment.entity";
import {FilmGeneralSetting} from "./modules/film/setting/general/entities/general-setting.entity";
import {FilmAdvanceSetting} from "./modules/film/setting/general/entities/advance-setting.entity";
import {FilmSeoSetting} from "./modules/film/setting/general/entities/seo-setting.entity";
import {FilmApiSetting} from "./modules/film/setting/general/entities/api-setting.entity";
import {FilmSocialSetting} from "./modules/film/setting/general/entities/social-setting.entity";
import {FilmOpengraphSetting} from "./modules/film/setting/general/entities/opengraph-setting.entity";
import {PostLike} from "./modules/Danim/post/post-like.entity";
import {APP_GUARD} from "@nestjs/core";
import {OptionalJwtAuthGuard} from "./shared/auth/guards/jwt-auth-optional.guard";
import {PostBookmark} from "./modules/Danim/post/post-bookmark.entity";
import {SmsModule} from "./shared/gateways/sms/sms.module";
import {OtpCode} from "./shared/gateways/sms/entities/otp-code.entity";
import {RequestSupporter} from "./modules/supporter/requests/request-supporter.entity";
import {
    KindnessMeetingRegistration
} from "./modules/supporter/requests/kindness-meeting/kindness-meeting-registration.entity";
import {PaymentModule} from "./shared/gateways/payments/payment.module";
import {Order} from "./shared/order/order.entity";
import {Transaction} from "./shared/transaction/transaction.entity";
import {MediaFavorite} from "./modules/film/content/film-favorite.entity";
import {MediaWatchList} from "./modules/film/content/film-watch-list.entity";
import {MediaWatched} from "./modules/film/content/media-watched.entity";
import {ReportEntity} from "./modules/film/report/report.entity";
import {UserSetting} from "./shared/user/entities/user-setting.entity";
import {TenantContextMiddleware} from "./core/middleware/tenant-context.middleware";
import {Capability} from "./core/entities/capability.entity";
import {Permission} from "./core/entities/permission.entity";
import {Role} from "./core/entities/role.entity";
import {Tenant} from "./core/entities/tenant.entity";
import {TenantCapability} from "./core/entities/tenant-capability.entity";
import {TenantUser} from "./core/entities/tenant-user.entity";
import {TenantController} from "./tenants/tenant.controller";
import {TenantResolverMiddleware} from "./core/middleware/tenant-resolver.middleware";
import {RolePermission} from "./core/entities/role-permission.entity";
import {MarketProduct} from "./modules/market/product/entities/product.entity";
import {MarketModule} from "./modules/market/market.module";
import {TenantModule} from "./tenants/tenant.module";
import {TenantCategory} from "./modules/market/category/tenant-category.entity";
import {ProductTenantCategory} from "./modules/market/product/entities/product-category.entity";
import {ProductOrderItem} from "./modules/market/order/product-order-item.entity";
import {Payment} from "./shared/gateways/payments/payment.entity";
import {Wallet} from "./shared/wallet/wallet.entity";
import {WalletModule} from "./shared/wallet/wallet.module";
import {ProductReview} from "./modules/market/review/product-review.entity";
import {ReferenceModule} from "./shared/refrences/reference.module";
import {Animal} from "./shared/refrences/entities/animal.entity";
import {Brand} from "./shared/refrences/entities/brand.entity";
import {Attribute} from "./shared/refrences/entities/attribute.entity";
import {Product} from "./shared/product/product.entity";
import {ShopRequest} from "./modules/market/user/shops/shop-request.entity";
import {ShopReview} from "./modules/market/review/shop-review.entity";
import {ProductFeature} from "./modules/market/product/entities/product-feature.entity";
import {ProductVariant} from "./modules/market/product/entities/product-variant.entity";
import {ProductSpecification} from "./modules/market/product/entities/product-specification.entity";
import {UserAddress} from "./shared/address/address.entity";
import {UserAddressModule} from "./shared/address/address.module";
import {MarketSetting} from "./modules/market/settings/market-setting.entity";
import {WalletTransaction} from "./shared/wallet/wallet-transaction.entity";
import {DiscountModule} from "./shared/discount/discount.module";
import {Discount} from "./shared/discount/discount.entity";
import {SessionModule} from "./shared/user/session.module";
import {Session} from "./shared/user/entities/session.entity";
import {BullModule} from "@nestjs/bull";
import {AcceptLanguageResolver, HeaderResolver, I18nModule, QueryResolver} from "nestjs-i18n";
import * as path from "path";
import {AdminShopModule} from "./modules/market/admin/shops/admin-shop.module";
import {UserShopModule} from "./modules/market/user/shops/user-shop.module";
import {QueueUiModule} from "./shared/queue/queue-ui-module";
import {TicketsModule} from "./shared/ticket/ticket.module";
import {Ticket} from "./shared/ticket/ticket.entity";
import {TicketMessage} from "./shared/ticket/ticket-messages.entity";
import {PendingShopInfoChange} from "./modules/market/settings/pending-shop-info-change.entity";
import {JobModule} from "./shared/job/job.module";
import {Withdrawal} from "./modules/market/request/entities/withdrawal.entity";
import {BankCard} from "./modules/market/account/bank-card.entity";
import {TenantAccess} from "./core/entities/tenant-access.entity";
import {ProductLike} from "./modules/market/product/entities/product-like.entity";
import {Appointment} from "./modules/vet&clinic/entities/appointment.entity";
import {Pet} from "./modules/vet&clinic/entities/pet.entity";
import {UserTenantModule} from "./shared/request/user/user-tenant.module";
import {TenantRequest} from "./shared/request/entities/tenant-request.entity";
import {TenantSetting} from "./shared/request/entities/tenant-setting.entity";
import {AdminTenantModule} from "./shared/request/admin/admin-tenant.module";
import {ClinicModule} from "./modules/vet&clinic/clinic.module";
import {TenantSettingChangeRequest} from "./shared/request/entities/tenant-setting-change-request.entity";
import {VetClinicServiceEntity} from "./modules/vet&clinic/entities/service.entity";
import {Consultation} from "./socket/consultation/consultation.entity";
import {ConsultationsModule} from "./socket/consultation/consultations.module";
import {TenantReviewModule} from "./shared/reviews/tenant-review.module";
import {TenantReview} from "./shared/reviews/tenant-review.entity";
import {PharmacyModule} from "./modules/pharmacy/pharmacy.module";
import {PharmacyMedicineModule} from "./modules/pharmacy/medicine/pharmacy-medicine.module";
import {PharmacyMedicine} from "./modules/pharmacy/medicine/pharmacy-medicine.entity";
import {Medicine} from "./shared/medicine/medicine.entity";
import {TimeOffBlock} from "./modules/vet&clinic/entities/time-off.entity";
import {AdminSettingModule} from "./shared/settings/admin-settings-module";
import {AdminSetting} from "./shared/settings/admin-settings-entity";
import {AdminFaq} from "./shared/faqs/entities/admin-faqs.entity";
import {AdminFaqCategory} from "./shared/faqs/entities/admin-faqs-category.entity";
import {AdminFaqsModule} from "./shared/faqs/admin-faqs.module";
import {ActivityLog} from "./shared/activities/activity-log.entity";
import {ActivitiesLogModule} from "./shared/activities/activities-log.module";
import {RolesModule} from "./shared/role/roles.module";
import {AdminUsersModule} from "./shared/request/admin/users/admin-users.module";
import {AdminPanelModule} from "./shared/request/admin/panel/panel.module";
import {AppointmentQueue} from "./modules/vet&clinic/appointment/entities/appointment-queue.entity";
import {TemporarySlotReservation} from "./modules/vet&clinic/appointment/entities/temporary-slot-reservation.entity";
import {TenantSpecialty} from "./core/entities/tenant-specialty.entity";
import {ClinicService} from "./modules/vet&clinic/entities/clinic-service.entity";
import {TenantAddress} from "./core/entities/tenant-address.entity";
import {AlopeykModule} from "./shared/gateways/shippments/alopeyk/alopeyk.module";
import {FirebaseAdminModule} from "./common/firebase-admin.module";
import {TokenBlacklist} from "./shared/user/entities/token-blacklist.entity";
import {Contract} from "./core/entities/contract.entity";
import {ContractModule} from "./shared/contract/contract.module";


@Module({
    imports: [/*ThrottlerModule.forRoot([
        {
            ttl: 60000, // ۱ دقیقه
            limit: 10, // حداکثر ۱۰ درخواست در دقیقه برای کل اپ (اینجا در کنترلر اورراید می‌شود)
        },
    ]),*/
        ConfigModule.forRoot({
            isGlobal: true, // برای دسترسی در کل پروژه
        }),
        I18nModule.forRoot({
            fallbackLanguage: 'fa',
            loaderOptions: {
                path: path.join(__dirname, '..', 'i18n/'),
                watch: true,
            },

            resolvers: [
                {use: QueryResolver, options: ['lang']},
                AcceptLanguageResolver,
                new HeaderResolver(['x-lang']),
            ],
        }),
        // تنظیمات اتصال به ردیس
        BullModule.forRoot({
            redis: {
                host: '127.0.0.1', // یا آدرس سرور ردیس شما
                port: 6379,
            },
        }),
        TypeOrmModule.forRoot({
            type: 'postgres',
            host: 'localhost',
            port: 5432,
            username: 'postgres',
            password: 'ame@6558U',
            database: 'petoman',
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
                Tenant,Contract, Capability, TenantCapability,TenantSpecialty, TenantUser, TenantCategory, TenantAccess,
                //Product
                Product, MarketProduct, ProductLike, MarketSetting, ProductTenantCategory, ProductOrderItem, ProductReview, ShopReview,
                ProductFeature, ProductVariant, ProductSpecification,
                //Payment
                Payment, Wallet, Order, Transaction, WalletTransaction,
                //Reference
                Animal, Brand, Attribute,
                //
                ShopRequest, Discount, Session,TokenBlacklist,
                //
                Ticket, TicketMessage, PendingShopInfoChange,
                //
                Withdrawal, BankCard, Consultation,
                //
                Appointment, Pet, TenantRequest,TenantAddress, TenantSetting, TimeOffBlock,AppointmentQueue,TemporarySlotReservation,
                TenantSettingChangeRequest, VetClinicServiceEntity, TenantReview,ClinicService,

                //
                PharmacyMedicine, Medicine, AdminSetting, AdminFaq, AdminFaqCategory, ActivityLog,
            ], // یا از autoLoadEntities استفاده کن
            synchronize: true, // فقط برای توسعه، نه تولید!
        }), JwtModule.register({
            secret: process.env.JWT_SECRET || 'secret-key',
            signOptions: {expiresIn: '1d'},
        }), AccessControlModule.forRoles(roles), UserModule, UserAddressModule, SmsModule,
        UploadModule, CategoryModule, TagModule, FaqModule,
        NotificationModule, ConfigModule, AuthModule, MessageModule,
        SupporterModule, DanimModule, FilmModule, PaymentModule,
        MarketModule, TenantModule, WalletModule, ReferenceModule, DiscountModule, SessionModule,
        QueueUiModule, AdminShopModule, UserShopModule, TicketsModule, JobModule, UserTenantModule,
        AdminTenantModule, ClinicModule, ConsultationsModule,
        TenantReviewModule, PharmacyModule, PharmacyMedicineModule, AdminSettingModule, AdminFaqsModule,
        ActivitiesLogModule,RolesModule,AdminUsersModule,AdminPanelModule,AlopeykModule,FirebaseAdminModule,ContractModule],
    controllers: [AppController, TenantController],
    providers: [AppService,
        {
            provide: APP_GUARD,
            useClass: OptionalJwtAuthGuard,
        }],
})
export class AppModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(TenantContextMiddleware, TenantResolverMiddleware)
            .forRoutes(
                {path: 'market/*path', method: RequestMethod.ALL},
                {path: 'pharmacy/*path', method: RequestMethod.ALL},
                {path: 'vetClinic/*path', method: RequestMethod.ALL},
                {path: 'wallet/tenant', method: RequestMethod.GET},
                {path: 'wallet/transactions/tenant', method: RequestMethod.GET},
                {path: 'wallet/transactions/platform-fee/tenant', method: RequestMethod.GET},
                {path: 'admin/shops/requests/tenants', method: RequestMethod.GET},
                {path: 'admin/shops/requests/tenants/:id', method: RequestMethod.GET},
                {path: 'alopeyk/:id/ship-alopeyk', method: RequestMethod.POST},
                {path: 'alopeyk/:id/cancel-shipment', method: RequestMethod.POST},
            );
    }
}
