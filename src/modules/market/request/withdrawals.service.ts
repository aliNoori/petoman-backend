import {BadRequestException, Injectable, NotFoundException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {Withdrawal, WithdrawalStatus} from './entities/withdrawal.entity';
import {CreateWithdrawalDto} from './dto/create-withdrawal.dto';
import {Wallet, WalletType} from "../../../shared/wallet/wallet.entity";
import {BankCard} from "../account/bank-card.entity";
import {TenantContext} from "../../../tenants/tenant-context.service";
import {WalletTransactionType} from "../../../shared/wallet/wallet-transaction.entity";
import {WalletService} from "../../../shared/wallet/wallet.service";

@Injectable()
export class WithdrawalsService {
    constructor(
        private tenantContext: TenantContext,
        @InjectRepository(Withdrawal)
        private withdrawalsRepository: Repository<Withdrawal>,
        @InjectRepository(Wallet)
        private walletsRepository: Repository<Wallet>,
        @InjectRepository(BankCard)
        private bankCardsRepository: Repository<BankCard>,
        private walletService: WalletService,
    ) {
    }

    async create(userId: string, createWithdrawalDto: CreateWithdrawalDto) {
        const tenantId = this.tenantContext.getTenantId()

        // ۱. پیدا کردن کارت بانکی
        const card = await this.bankCardsRepository
            .createQueryBuilder('card')
            .where('card.id = :cardId', {cardId: createWithdrawalDto.cardId})
            .andWhere('card.userId = :userId', {userId})
            .andWhere('card.tenantId = :tenantId', {tenantId})
            .getOne();

        if (!card) {
            throw new BadRequestException('کارت بانکی یافت نشد');
        }

        // ۲. پیدا کردن ولت (بدون بررسی موجودی اینجا، چون در تراکنش چک می‌شود)
        const wallet = await this.walletsRepository.findOne({
            where: {userId, tenantId, type: WalletType.SHOP}
        });

        if (!wallet) {
            throw new BadRequestException('کیف پول یافت نشد');
        }

        // استفاده از Transaction برای یکپارچگی داده‌ها
        const queryRunner = this.walletsRepository.manager.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // ۳. کسر موجودی و ثبت تراکنش در جدول wallet_transactions
            // استفاده از متد executeTransaction از WalletService
            await this.walletService.executeTransaction(
                queryRunner.manager, // پاس دادن مدیر تراکنش جاری
                wallet,
                WalletTransactionType.DEBIT, // نوع تراکنش: کسر موجودی
                createWithdrawalDto.amount,
                `درخواست برداشت وجه به شماره کارت ${card.cardNumber}`, // توضیحات تراکنش
                undefined, // referenceId (در صورت نیاز می‌توانید ID برداشت را بعداً ست کنید)
                undefined  // relatedWalletId
            );

            // ۴. ثبت درخواست تسویه
            const withdrawal = queryRunner.manager.create(Withdrawal, {
                amount: createWithdrawalDto.amount,
                status: WithdrawalStatus.PENDING,
                note: createWithdrawalDto.note,
                bankName: card.bankName,
                cardNumber: card.cardNumber,
                iban: card.iban,
                wallet: wallet,
                user: {id: userId} as any,
                tenant: {id: tenantId} as any
            });

            const savedWithdrawal = await queryRunner.manager.save(withdrawal);

            // (اختیاری) اگر می‌خواهید در تراکنش ثبت شده، referenceId برابر با ID درخواست برداشت باشد:
            // این مرحله نیاز به ویرایش executeTransaction یا آپدیت جداگانه دارد که فعلاً ساده نگه می‌داریم.

            await queryRunner.commitTransaction();
            return savedWithdrawal;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw new BadRequestException('خطا در ثبت درخواست تسویه: ' + err.message);
        } finally {
            await queryRunner.release();
        }
    }
    async findAll(userId: string) {
        const tenantId = this.tenantContext.getTenantId()
        return this.withdrawalsRepository.find({
            where: {user: {id: userId}, tenant: {id: tenantId}},
            order: {createdAt: 'DESC'},
        } as any);
    }
}