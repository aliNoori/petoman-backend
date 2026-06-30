import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateBankCardDto } from './dto/create-bank-card.dto';
import {BankCard} from "./bank-card.entity";
import {TenantContext} from "../../../tenants/tenant-context.service";

@Injectable()
export class BankCardsService {
    constructor(
        private tenantContext: TenantContext,
        @InjectRepository(BankCard)
        private bankCardsRepository: Repository<BankCard>,
    ) {}

    // لیست بانک‌های ایرانی (شناسایی بر اساس ۶ رقم اول)
    private detectBankName(cardNumber: string): string {
        const bin = cardNumber.substring(0, 6);
        const bankMap: Record<string, string> = {
            '603799': 'بانک ملی ایران',
            '589210': 'بانک سپه',
            '627961': 'بانک صنعت و معدن',
            '603770': 'بانک کشاورزی',
            '628023': 'بانک مسکن',
            '627353': 'بانک تجارت',
            '627412': 'بانک اقتصاد نوین',
            '622106': 'بانک پارسیان',
            '502229': 'بانک پاسارگاد',
            '627488': 'بانک کارآفرین',
            '621986': 'بانک سامان',
            '639347': 'بانک سینا',
            '639607': 'بانک سرمایه',
            '627381': 'بانک انصار',
            // ... سایر بانک‌ها
        };
        return bankMap[bin] || 'سایر بانک‌ها';
    }

    async create(userId: string, createBankCardDto: CreateBankCardDto) {

        const tenantId = this.tenantContext.getTenantId();

        const { cardNumber, iban } = createBankCardDto;

        // ۱. اعتبارسنجی: حداقل یکی باید وارد شده باشد
        if (!cardNumber && !iban) {
            throw new BadRequestException('شماره کارت یا شبا الزامی است');
        }

        // ۲. بررسی تکراری نبودن
        const existingCard = await this.bankCardsRepository.findOne({
            where: [
                { cardNumber: cardNumber || '' },
                { iban: iban || '' }
            ]
        });

        if (existingCard) {
            throw new BadRequestException('این کارت یا شبا قبلاً ثبت شده است');
        }

        // ۳. تشخیص نام بانک
        let detectedBankName = 'سایر بانک‌ها';
        if (cardNumber) {
            detectedBankName = this.detectBankName(cardNumber);
        }

        // ۴. بررسی اینکه آیا کاربر کارت دیگری دارد؟ اگر ندارد، این پیش‌فرض شود
        const userCardsCount = await this.bankCardsRepository.count({ where: { userId } });
        const isDefault = userCardsCount === 0;

        // ۵. ذخیره کارت
        const newCard = this.bankCardsRepository.create({
            cardNumber: cardNumber,
            iban: iban,
            bankName: detectedBankName,
            isDefault,
            userId, // ارتباط با کاربر
            tenantId,
            verified: true // فرض بر تایید فوری (یا می‌توان API استعلام زد)
        });

        return await this.bankCardsRepository.save(newCard);
    }

    async findAll(userId: string) {
        const tenantId=this.tenantContext.getTenantId()
        return this.bankCardsRepository.find({
            where: { user: { id: userId },tenantId },
            order: { isDefault: 'DESC', createdAt: 'DESC' } // پیش‌فرض اول بیاید
        } as any);
    }

    async setDefault(userId: string, cardId: string) {
        // پیدا کردن کارت مورد نظر
        const card = await this.bankCardsRepository.findOne({
            where: { id: cardId, userId  }
        });

        if (!card) {
            throw new NotFoundException('کارت یافت نشد');
        }

        // حذف پیش‌فرض بودن از سایر کارت‌های این کاربر
        await this.bankCardsRepository
            .createQueryBuilder()
            .update(BankCard)
            .set({ isDefault: false })
            .where('userId = :userId', { userId }) // مستقیماً از ستون دیتابیس استفاده می‌کند
            .execute();

        // تنظیم کارت جدید به عنوان پیش‌فرض
        card.isDefault = true;
        return await this.bankCardsRepository.save(card);
    }

    async remove(userId: string, cardId: string) {
        const card = await this.bankCardsRepository.findOne({
            where: { id: cardId, userId  }
        } );

        if (!card) {
            throw new NotFoundException('کارت یافت نشد');
        }

        // اگر کارت پیش‌فرض بود و کاربر کارت دیگری دارد، نباید اجازه حذف داد (یا باید یکی دیگری را پیش‌فرض کرد)
        if (card.isDefault) {
            const count = await this.bankCardsRepository.count({ where: { userId } });
            if (count > 1) {
                throw new BadRequestException('Cannot delete default card. Please set another card as default first.');
            }
        }

        await this.bankCardsRepository.remove(card);
        return { message: 'کارت با موفقیت حذف شد' };
    }
}