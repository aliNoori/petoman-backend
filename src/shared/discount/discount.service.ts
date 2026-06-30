import {Injectable, BadRequestException, NotFoundException} from "@nestjs/common";
import {InjectDataSource} from "@nestjs/typeorm";
import {DataSource, EntityManager} from "typeorm";
import {Discount} from "./discount.entity";
import {CreateDiscountDto} from "./discount.dto";
import {I18nService} from "nestjs-i18n";

@Injectable()
export class DiscountService {
    constructor(
        private readonly i18n: I18nService,
        @InjectDataSource() private dataSource: DataSource
    ) {
    }

    // ایجاد کد تخفیف
    async create(dto: CreateDiscountDto, userId: string) {
        const repo = this.dataSource.getRepository(Discount);

        const existing = await repo.findOne({where: {code: dto.code}});
        if (existing) {
            throw new BadRequestException(await this.i18n.t('discount.already_exist'));
        }

        const discount = repo.create({
            ...dto,
            userId // ذخیره سازنده کد
        });
        return repo.save(discount);
    }

    async claimDiscountCode(discountCode: string, userId: string) {
        const repo = this.dataSource.getRepository(Discount);

        // بررسی اینکه آیا کد تخفیف در سیستم وجود دارد یا خیر
        const discount = await repo.findOne({where: {code: discountCode}});

        if (!discount) {
            throw new BadRequestException(await this.i18n.t('discount.apply_invalid'));
        }

        // بررسی اینکه آیا کاربر قبلاً این کد را دریافت کرده است
        if (discount.usedByUsers?.includes(userId)) {
            throw new BadRequestException(await this.i18n.t('discount.apply_already_used'));
        }

        // بررسی ظرفیت کد
        if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
            throw new BadRequestException(await this.i18n.t('discount.apply_limit_reached'));
        }

        // اضافه کردن کاربر به لیست دریافت‌کنندگان (usedByUsers)
        if (!discount.usedByUsers) {
            discount.usedByUsers = [];
        }
        discount.usedByUsers.push(userId);

        // افزایش تعداد استفاده (اختیاری: بستگی به منطق شما دارد که آیا دریافت کد = استفاده از کد است یا خیر)
        discount.usedCount += 1;

        return repo.save(discount);
    }

    // دریافت کدهای تخفیف کاربر جاری
    async getUserDiscounts(userId: string) {

        const repo = this.dataSource.getRepository(Discount);

        return repo.createQueryBuilder('discount')
            // چون ستون از نوع simple-array است، مقادیر با کاما جدا شده‌اند (مثلا id1,id2)
            // ما با استفاده از LIKE چک می‌کنیم که آیا userId در این رشته وجود دارد
            // به عنوان مثال: ,7d7dd..., یا 7d7dd..., یا ,7d7dd...$
            // این کار جلوی تطبیق ناقص (مثلا پیدا کردن id123 در داخل id1234) را می‌گیرد
            .where(`"discount"."usedByUsers" LIKE :pattern`, {
                pattern: `%,${userId},%`
            })
            // حالت‌های خاص: اگر کاربر اولین نفر باشد یا تنها نفر باشد
            .orWhere(`"discount"."usedByUsers" LIKE :patternStart`, {
                patternStart: `${userId},%`
            })
            .orWhere(`"discount"."usedByUsers" LIKE :patternEnd`, {
                patternEnd: `%,${userId}`
            })
            .orWhere(`"discount"."usedByUsers" = :exact`, {
                exact: userId
            })
            .orderBy('discount.createdAt', 'DESC')
            .getMany();
    }

    /**
     * اعتبارسنجی و اعمال کد تخفیف
     * این متد برای استفاده در داخل تراکنش‌ها بهینه شده است
     */
    async validateAndApplyDiscount(
        manager: EntityManager, // استفاده از EntityManager برای قرار گرفتن در تراکنش
        code: string,
        userId: string,
        cartTotal: number,
        canApply?: boolean
    ) {
        const repo = manager.getRepository(Discount);
        const discount = await repo.findOne({where: {code}});

        if (!discount) {
            throw new BadRequestException(await this.i18n.t('discount.apply_invalid'));
        }
        if (!discount.isActive) {
            throw new BadRequestException(await this.i18n.t('discount.apply_inactive'));
        }
        if (discount.expireDate && new Date(discount.expireDate) < new Date()) {
            throw new BadRequestException(await this.i18n.t('discount.apply_expired'));
        }

        // بررسی استفاده قبلی
        const hasUsed = discount.usedByUsers?.includes(userId);
        if (hasUsed) {
            throw new BadRequestException(await this.i18n.t('discount.apply_already_used'));
        }
        if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
            throw new BadRequestException(await this.i18n.t('discount.apply_limit_reached'));
        }
        if (discount.minPurchase && cartTotal < discount.minPurchase) {
            throw new BadRequestException(await this.i18n.t('discount.apply_min_purchase', {args: {minAmount: String(discount.minPurchase)}}));
        }

        // محاسبه تخفیف
        let discountAmount = 0;
        if (discount.type === 'percent') {
            discountAmount = (cartTotal * discount.value) / 100;
            if (discount.maxDiscountAmount && discountAmount > discount.maxDiscountAmount) {
                discountAmount = discount.maxDiscountAmount;
            }
        } else {
            discountAmount = discount.value;
        }
        if (canApply) {
            // به‌روزرسانی وضعیت در همان تراکنش
            if (!discount.usedByUsers) {
                discount.usedByUsers = [];
            }
            discount.usedByUsers.push(userId);
            discount.usedCount += 1;

            await repo.save(discount);
        }


        return {
            //discountId: discount.id,
            code: discount.code,
            discountAmount,
            finalAmount: cartTotal - discountAmount
        };
    }

    async revokeDiscount(
        manager: EntityManager,
        discountId: string,
        userId: string
    ) {
        const repo = manager.getRepository(Discount);

        // لود کردن دیتا بدون Relation
        const discount = await manager.findOne(Discount, {
            where: {id: discountId}
        } as any);

        if (!discount) {
            throw new NotFoundException(await this.i18n.t('discount.claim_not_found'));
        }

        // بررسی اینکه آیا کد هنوز فعال است
        if (!discount.isActive) {
            throw new BadRequestException(await this.i18n.t('discount.apply_inactive'));
        }

        // اطمینان از اینکه usedByUsers یک آرایه است
        // اگر در دیتابیس به صورت رشته ذخیره شده باشد، باید پارس شود
        // اگر simple-array باشد، TypeORM معمولاً آن را به آرایه تبدیل می‌کند.

        let usedByUsers: string[] = discount.usedByUsers || [];

        // بررسی اینکه آیا کاربر این کد را قبلاً استفاده کرده است
        const userIndex = usedByUsers.indexOf(userId);
        if (userIndex === -1) {
            throw new BadRequestException(await this.i18n.t('discount.apply_already_used'));
        }

        // حذف کاربر از لیست استفاده‌کنندگان
        usedByUsers.splice(userIndex, 1);

        // کاهش تعداد استفاده‌ها (به شرطی که بیشتر از صفر باشد)
        if (discount.usedCount > 0) {
            discount.usedCount -= 1;
        }

        // اختصاص مجدد آرایه اصلاح شده به اشیاء دیتابیس
        discount.usedByUsers = usedByUsers;

        await repo.save(discount);

        return {
            message: await this.i18n.t('discount.revoked_successfully'),
            discountId: discount.id,
            remainingUses: discount.usedCount
        };
    }
}