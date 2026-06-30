import {DataSource, EntityManager, Repository} from "typeorm";
import {BadRequestException, ForbiddenException, Injectable, NotFoundException} from "@nestjs/common";
import {Wallet, WalletType} from "./wallet.entity";
import {WalletTransaction, WalletTransactionType} from "./wallet-transaction.entity";
import {InjectRepository} from "@nestjs/typeorm";
import {TenantContext} from "../../tenants/tenant-context.service";
import {Role} from "../../core/entities/role.entity";
import {Payment} from "../gateways/payments/payment.entity";
import {PaymentStatus} from "../gateways/payments/payment-status-machine.enum";

@Injectable()
export class WalletService {
    constructor(
        private dataSource: DataSource,
        private tenantContext: TenantContext,
        @InjectRepository(Wallet)
        private walletRepository: Repository<Wallet>,
    ) {
    }

    private getWalletRepo(manager: EntityManager): Repository<Wallet> {
        return manager.getRepository(Wallet);
    }

    private getTransactionRepo(manager: EntityManager): Repository<WalletTransaction> {
        return manager.getRepository(WalletTransaction);
    }

    /**
     * Get wallet based on specific logic:
     * - USER: Uses userId (tenantId is ignored/null)
     * - SHOP: Uses tenantId (userId is ignored/null)
     * - PETOMAN: Uses neither (Global wallet)
     */
    async getWallet(
        tenantId: string | undefined,
        userId: string | undefined,
        type: WalletType,
        manager?: EntityManager
    ): Promise<Wallet> {
        const repo = manager ? manager.getRepository(Wallet) : this.dataSource.getRepository(Wallet);

        // Build query condition dynamically based on wallet type
        const whereCondition: any = {type};

        if (type === WalletType.USER) {
            if (!userId) throw new BadRequestException("UserId is required for USER wallet");
            whereCondition.userId = userId;
            // tenantId is not used for USER wallets in this logic
        } else if (type === WalletType.SHOP) {
            if (!tenantId) throw new BadRequestException("TenantId is required for SHOP wallet");
            whereCondition.tenantId = tenantId;
            // userId is not used for SHOP wallets
        } else if (type === WalletType.PETOMAN) {
            // PETOMAN wallet is global, usually no specific ID needed unless multiple platforms exist
            // Assuming there is only one PETOMAN wallet or it's identified solely by type
        }

        const wallet = await repo.findOne({where: whereCondition});

        if (!wallet) {
            throw new NotFoundException(`${type} wallet not found`);
        }
        return wallet;
    }

    /**
     * Get or create wallet (Legacy support)
     * Adjusted to create a USER wallet without tenantId dependency
     */
    async getOrCreateWalletUser(userId: string, walletType: WalletType): Promise<Wallet> {
        // استفاده از ریپازیتوری به جای manager
        let wallet = await this.walletRepository.findOne({
            where: {userId, type: walletType},
            select: ['id', 'userId', 'balance'],
            relations: ['transactions']
        });

        if (!wallet) {
            wallet = this.walletRepository.create({
                userId,
                type: walletType,
                balance: 0,
            });
            await this.walletRepository.save(wallet);
        }
        return wallet;
    }

    /**
     * Get or create wallet (Legacy support)
     * Adjusted to create a USER wallet without tenantId dependency
     */
    async getOrCreateWalletTenant(userId: string, walletType: WalletType): Promise<Wallet> {
        const tenantId = this.tenantContext.getTenantId()
        let wallet = await this.walletRepository.findOne({
            where: {tenantId, userId, type: walletType},
            select: ['id', 'userId', 'tenantId', 'balance', 'updatedAt']
        });

        if (!wallet) {
            wallet = this.walletRepository.create({
                tenantId,
                userId,
                type: walletType,
                balance: 0,
            });
            await this.walletRepository.save(wallet);
        }
        return wallet;
    }

    /**
     * Get or create wallet (Legacy support)
     * Adjusted to create a USER wallet without tenantId dependency
     */
    async getOrCreateWalletPlatform(userId: string, walletType: WalletType): Promise<Wallet> {
        // ۲. دریافت کیف پول به همراه اطلاعات کاربر و نقش‌های او
        let wallet = await this.walletRepository.findOne({
            where: { userId, type: walletType },
            select: ['id', 'userId', 'balance'],
            relations: ['transactions', 'user', 'user.roles'], // <--- ۲. تغییر user.role به user.roles
        } as any);

        // ۳. بررسی دسترسی سوپر ادمین
        // چون کاربر می‌تواند چند نقش داشته باشد، باید بررسی کنیم آیا هیچ‌کدام SUPER_ADMIN نیستند
        if (wallet?.user && wallet.user.roles) {
            const hasSuperAdminRole = wallet.user.roles.some((role: Role) => role.name === 'SUPER_ADMIN');

            if (!hasSuperAdminRole) {
                throw new ForbiddenException('دسترسی غیرمجاز');
            }
        }

        // ۴. ایجاد کیف پول در صورت عدم وجود
        if (!wallet) {
            wallet = this.walletRepository.create({
                userId,
                type: walletType,
                balance: 0,
            });
            await this.walletRepository.save(wallet);
        }

        return wallet;
    }

    async getMyWallet(userId: string) {
        const wallet = await this.dataSource.getRepository(Wallet).findOne({
            where: {userId, type: WalletType.USER}
        });
        if (!wallet) {
            throw new NotFoundException('Wallet not found');
        }
        return wallet;
    }

    async getTransactions(
        tenantId: string | undefined,
        userId: string | undefined,
        type: WalletType,
        options: { page: number, limit: number, type?: 'CREDIT' | 'DEBIT' }
    ) {
        // Re-use getWallet logic to find the correct wallet
        tenantId = this.tenantContext.getTenantId()
        const wallet = await this.getWallet(tenantId, userId, type);
        const {page, limit, type: txType} = options;

        const query = this.dataSource.getRepository(WalletTransaction)
            .createQueryBuilder('tx')
            .where('tx.walletId = :walletId', {walletId: wallet.id})
            .orderBy('tx.createdAt', 'DESC');

        if (txType) {
            query.andWhere('tx.type = :type', {type: txType});
        }

        const [data, total] = await query
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();

        return {
            data,
            meta: {page, limit, total}
        };
    }

    async getPlatformFeeTransactions(
        tenantId: string | undefined,
        userId: string | undefined,
        type: WalletType, // این پارامتر احتمالاً باید نوع کیف پول پلتفرم باشد (مثلاً PETOMAN یا PLATFORM)
        options: { page: number; limit: number; type?: 'FEE_INCOME' }
    ) {
        // 1. استخراج پارامترها
        const { page, limit, type: txType } = options;

        // اطمینان از اینکه tenantId صحیح باشد
        const resolvedTenantId = tenantId || this.tenantContext.getTenantId();

        if (!resolvedTenantId) {
            return { data: [], meta: { page, limit, total: 0 } };
        }

        // 2. پیدا کردن تمام Payment های این تِنانت
        // فرض بر این است که جدول payments ستونی به نام tenantId دارد
        const payments = await this.dataSource.getRepository(Payment).find({
            where: { tenantId: resolvedTenantId,status:PaymentStatus.PAID },
            select: ['id'] // فقط به ID پرداخت‌ها نیاز داریم
        });

        if (payments.length === 0) {
            return { data: [], meta: { page, limit, total: 0 } };
        }

        // استخراج ID های پرداخت‌ها برای استفاده در کوئری بعدی
        const paymentIds = payments.map((p) => p.id);

        // 3. پیدا کردن کیف پول پلتفرم (که کارمزدها در آن جمع می‌شود)
        // نکته: بهتر است این کار را یک‌بار انجام دهید و کش کنید یا در متغیر ذخیره کنید
        const platformWallet = await this.getWallet(undefined, undefined, type); // فرض بر این است که 'type' پارامتر ورودی، نوع کیف پول پلتفرم است

        if (!platformWallet) {
            throw new Error('Platform wallet not found');
        }

        // 4. کوئری برای یافتن تراکنش‌های کارمزد (FEE_INCOME) در کیف پول پلتفرم
        // که referenceId آن‌ها در لیست ID پرداخت‌های تِنانت باشد
        const query = this.dataSource.getRepository(WalletTransaction)
            .createQueryBuilder('tx')
            .where('tx.walletId = :walletId', { walletId: platformWallet.id })
            .andWhere('tx.type = :type', { type: txType || 'FEE_INCOME' }) // اگر نوع خاصی مد نظر نیست، پیش‌فرض FEE_INCOME است
            .andWhere('tx.referenceId IN (:...paymentIds)', { paymentIds }); // اتصال به پرداخت‌های تِنانت

        // 5. اجرا و Pagination
        const [data, total] = await query
            .orderBy('tx.createdAt', 'DESC') // مرتب‌سازی بر اساس تاریخ
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();

        return {
            data,
            meta: { page, limit, total }
        };
    }

    /**
     * اجرای یک تراکنش کیف پول
     * این متد موجودی کیف پول را به‌روز کرده و تراکنش را ثبت می‌کند.
     */
    async executeTransaction(
        manager: EntityManager,
        wallet: Wallet,
        type: WalletTransactionType,
        amount: number,
        description: string,
        referenceId?: string,
        relatedWalletId?: string,
        metadata?: any
    ): Promise<WalletTransaction> {

        // تبدیل amount به عدد برای جلوگیری از خطاهای نوع داده
        const numAmount = Number(amount);
        const currentBalance = Number(wallet.balance);

        let newBalance: number;
        let isDebit: boolean = false;

        // تعیین نوع عملیات و محاسبه موجودی جدید
        // هم CREDIT/DEBIT و هم REFUND_IN/REFUND_OUT پشتیبانی می‌شوند
        if (
            type === WalletTransactionType.CREDIT ||
            type === WalletTransactionType.REFUND_IN
        ) {
            // حالت واریز (افزایش موجودی)
            newBalance = currentBalance + numAmount;
            isDebit = false;
        } else if (
            type === WalletTransactionType.DEBIT ||
            type === WalletTransactionType.REFUND_OUT
        ) {
            // حالت برداشت (کسر موجودی)
            newBalance = currentBalance - numAmount;
            isDebit = true;
        } else {
            throw new BadRequestException(`Unsupported wallet transaction type: ${type}`);
        }

        // اعتبارسنجی موجودی (فقط برای عملیات برداشت)
        if (isDebit && newBalance < 0) {
            throw new BadRequestException('Insufficient wallet balance');
        }

        // ایجاد رکورد تراکنش
        const transaction = manager.create(WalletTransaction, {
            walletId: wallet.id,
            relatedWalletId,
            type,
            amount: numAmount,
            balanceAfter: newBalance,
            referenceId,
            description,
            metadata,
            createdAt: new Date() // اطمینان از تنظیم تاریخ
        });

        // به‌روزرسانی موجودی کیف پول
        wallet.balance = newBalance;

        // ذخیره تراکنش و کیف پول در یک عملیات
        await manager.save([transaction, wallet]);

        return transaction;
    }

    async credit(tenantId: string | undefined, userId: string | undefined, type: WalletType, amount: number, description: string, referenceId?: string) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const wallet = await this.getWallet(tenantId, userId, type, queryRunner.manager);
            await this.executeTransaction(
                queryRunner.manager,
                wallet,
                WalletTransactionType.CREDIT,
                amount,
                description,
                referenceId
            );
            await queryRunner.commitTransaction();
            return {success: true, newBalance: wallet.balance};
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async debit(tenantId: string | undefined, userId: string | undefined, type: WalletType, amount: number, description: string, referenceId?: string) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const wallet = await this.getWallet(tenantId, userId, type, queryRunner.manager);
            await this.executeTransaction(
                queryRunner.manager,
                wallet,
                WalletTransactionType.DEBIT,
                amount,
                description,
                referenceId
            );
            await queryRunner.commitTransaction();
            return {success: true, newBalance: wallet.balance};
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async transfer(
        tenantId: string | undefined,
        fromUserId: string | undefined,
        fromType: WalletType,
        toType: WalletType,
        toUserId: string | undefined,
        amount: number,
        description: string
    ) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            // 1. Find Source Wallet
            const sourceWallet = await this.getWallet(tenantId, fromUserId, fromType, queryRunner.manager);

            // 2. Find Target Wallet
            // Logic: If target is USER, we need toUserId. If SHOP/PETOMAN, we use tenantId or none.
            let targetWallet: Wallet;

            if (toType === WalletType.USER) {
                if (!toUserId) throw new BadRequestException("Target UserId is required for transferring to a USER wallet");
                targetWallet = await this.getWallet(tenantId, toUserId, toType, queryRunner.manager);
            } else if (toType === WalletType.SHOP) {
                if (!tenantId) throw new BadRequestException("TenantId is required for transferring to a SHOP wallet");
                targetWallet = await this.getWallet(tenantId, undefined, toType, queryRunner.manager);
            } else {
                // PETOMAN
                targetWallet = await this.getWallet(undefined, undefined, toType, queryRunner.manager);
            }

            // 3. Execute Debit on Source
            await this.executeTransaction(
                queryRunner.manager,
                sourceWallet,
                WalletTransactionType.DEBIT,
                amount,
                `Transfer to ${toType}: ${description}`,
                undefined,
                targetWallet.id
            );

            // 4. Execute Credit on Target
            await this.executeTransaction(
                queryRunner.manager,
                targetWallet,
                WalletTransactionType.CREDIT,
                amount,
                `Transfer from ${fromType}: ${description}`,
                undefined,
                sourceWallet.id
            );

            await queryRunner.commitTransaction();
            return {success: true, fromBalance: sourceWallet.balance, toBalance: targetWallet.balance};
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async updateStatus(tenantId: string | undefined, userId: string | undefined, type: WalletType, status: string, reason?: string) {
        const wallet = await this.getWallet(tenantId, userId, type);
        wallet.status = status;
        await this.dataSource.getRepository(Wallet).save(wallet);
        return {success: true, status};
    }
}