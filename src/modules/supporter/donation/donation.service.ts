import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Donation} from "./donation.entity";
import { Supporter} from "../public-supporters/supporter.entity";
import {KindnessMeeting} from "../kindness-meeting/kindness-meeting.entity";
import {CreateDonationDto} from "./dto/create-donation.dto";
import {NotificationType} from "../../../shared/notification/notification.entity";
import {NotificationService} from "../../../shared/notification/notification.service";

@Injectable()
export class DonationService {
    constructor(
        private notifService: NotificationService,
        @InjectRepository(Donation)
        private readonly donationRepo: Repository<Donation>,
        @InjectRepository(Supporter)
        private readonly supporterRepo: Repository<Supporter>,
        @InjectRepository(KindnessMeeting)
        private readonly kindnessMeetingRepo: Repository<KindnessMeeting>,
    ) {}

    async create(dto: CreateDonationDto,user) {
        const supporter = await this.supporterRepo.findOne({ where: { id: dto.supporterId } });
        if (!supporter) throw new NotFoundException('حامی پیدا نشد');

        const kindnessMeeting = await this.kindnessMeetingRepo.findOne({ where: { id: dto.projectId } });
        if (!kindnessMeeting) throw new NotFoundException('پروژه پیدا نشد');

        const donation = this.donationRepo.create({
            amount: dto.amount,
            method: dto.method,
            status: dto.status ?? 'pending',
            trackingCode: dto.trackingCode,
            transactionTime: dto.transactionTime,
            checkNumber: dto.checkNumber,
            note: dto.note,
            date: dto.date,
            time: dto.time,
            supporter,
            kindnessMeeting,
        });

        await this.notifService.create({
            userId: user.id,
            type: NotificationType.IN_APP,
            title: 'کمک جدید',
            message: 'کمک با موفقیت ثبت شد.',
            icon:'ti ti-coin text-rose-600',
            color:'bg-rose-100',
            panelType:'hamian'
        });

        return await this.donationRepo.save(donation);
    }

    async update(id: string, dto: Partial<CreateDonationDto>): Promise<Donation> {
        const donation = await this.donationRepo.findOne({
            where: { id },
            relations: ['supporter', 'kindnessMeeting']
        })

        if (!donation) throw new NotFoundException('کمک مالی پیدا نشد')

        if (donation.status === 'completed') {
            throw new Error('ویرایش کمک‌های نهایی شده مجاز نیست')
        }

        if (dto.supporterId && dto.supporterId !== donation.supporter.id) {
            const supporter = await this.supporterRepo.findOne({ where: { id: dto.supporterId } })
            if (!supporter) throw new NotFoundException('حامی جدید پیدا نشد')
            donation.supporter = supporter
        }

        if (dto.projectId && dto.projectId !== donation.kindnessMeeting.id) {
            const project = await this.kindnessMeetingRepo.findOne({ where: { id: dto.projectId } })
            if (!project) throw new NotFoundException('پروژه جدید پیدا نشد')
            donation.kindnessMeeting = project
        }

        Object.assign(donation, {
            amount: dto.amount ?? donation.amount,
            method: dto.method ?? donation.method,
            status: dto.status ?? donation.status,
            trackingCode: dto.trackingCode ?? donation.trackingCode,
            transactionTime: dto.transactionTime ?? donation.transactionTime,
            checkNumber: dto.checkNumber ?? donation.checkNumber,
            note: dto.note ?? donation.note,
            date: dto.date ?? donation.date,
            time: dto.time ?? donation.time
        })

        return await this.donationRepo.save(donation)
    }

    async findAll() {
        return await this.donationRepo.find({relations: ['supporter', 'supporter.user', 'kindnessMeeting']});
    }
    async findOne(id: string): Promise<Donation> {
        const donation = await this.donationRepo.findOne({ where: { id } as any, relations: ['supporter', 'kindnessMeeting'] })
        if (!donation) throw new NotFoundException('کمک مالی پیدا نشد')
        return donation
    }

    async remove(id: string): Promise<void> {
        const donation = await this.donationRepo.findOne({ where: { id } })

        if (!donation) throw new NotFoundException('کمک مالی پیدا نشد')

        if (donation.status === 'completed') {
            throw new Error('حذف کمک‌های نهایی شده مجاز نیست')
        }

        await this.donationRepo.remove(donation)
    }

}