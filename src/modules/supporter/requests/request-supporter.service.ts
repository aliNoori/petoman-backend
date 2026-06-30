import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRequestSupporterDto } from './dto/create-request-supporter.dto';
import { User, UserRole } from '../../../shared/user/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { NotificationService } from '../../../shared/notification/notification.service';
import { NotificationType } from '../../../shared/notification/notification.entity';
import {RequestSupporter, RequestSupporterStatus} from './request-supporter.entity';
import {Supporter, SupporterStatus} from "../public-supporters/supporter.entity";
import {UploadController} from "../../../shared/upload/upload.controller";
import {UploadService} from "../../../shared/upload/upload.service";

@Injectable()
export class RequestSupporterService {
    constructor(
        private notifService: NotificationService,
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        @InjectRepository(RequestSupporter)
        private readonly requestRepo: Repository<RequestSupporter>,
        @InjectRepository(Supporter)
        private readonly supporterRepo: Repository<Supporter>,
        private readonly uploader:UploadService
    ) {}

    // کاربر درخواست می‌دهد
    async create(dto: CreateRequestSupporterDto) {
        const request = this.requestRepo.create({
            firstName: dto.firstName,
            lastName: dto.lastName,
            province:dto.province,
            city:dto.city,
            phone: dto.phone,
            email: dto.email,
            type: dto.type,
            motivation: dto.motivation,
            experience: dto.experience,
            showInList:dto.showInList,
            agreement:dto.agreement,
            status: RequestSupporterStatus.PENDING,
            avatar:dto.avatar,
            socialLinks:dto.socialLinks
        });

        await this.notifService.create({
            type: NotificationType.IN_APP,
            title: 'درخواست جدید حامی',
            message: 'یک درخواست جدید ثبت شد.',
            icon: 'ti ti-user-plus text-blue-600',
            color: 'bg-blue-100',
            panelType: 'hamian',
        });

        return this.requestRepo.save(request);
    }

    // مدیر همه درخواست‌ها را می‌بیند
    async findAll(): Promise<RequestSupporter[]> {
        return this.requestRepo.find();
    }

    // مدیر یک درخواست خاص را می‌بیند
    async findOne(id: string): Promise<RequestSupporter> {
        const req = await this.requestRepo.findOne({ where: { id } });
        if (!req) throw new NotFoundException('درخواست یافت نشد');
        return req;
    }

    // تایید درخواست توسط مدیر
    async approve(id: string): Promise<Supporter> {
        const req = await this.findOne(id);
        req.status = RequestSupporterStatus.APPROVED;
        await this.requestRepo.save(req);

        // بررسی کاربر
        if (!req.email && !req.phone) {
            throw new BadRequestException('ایمیل یا شماره تماس باید وارد شود');
        }

        let user = await this.userRepo.findOne({
            where: [{ email: req.email }, { phoneNumber: req.phone }],
        });

        if (!user) {
            const rawPassword = '12345678';
            const hashedPassword = await bcrypt.hash(rawPassword, 10);

            user = this.userRepo.create({
                fullName: `${req.firstName} ${req.lastName}`,
                firstName:`${req.firstName}`,
                lastName:`${req.lastName}`,
                email: req.email,
                avatar:req.avatar,
                phoneNumber: req.phone,
                password: hashedPassword,
                legacyRoles: [UserRole.HAMIAN_SUBSCRIBER],
            });
            user = await this.userRepo.save(user);
        }

        if (!user.legacyRoles.includes(UserRole.SUPPORTER_SUBSCRIBER)) {
            user.legacyRoles.push(UserRole.SUPPORTER_SUBSCRIBER);
            await this.userRepo.save(user);
        }

        const existingSupporter = await this.supporterRepo.findOne({
            where: { user: { id: user.id } as any },
        });

        if (existingSupporter) {
            throw new BadRequestException('این کاربر قبلاً به عنوان حامی ثبت شده است');
        }

        // ایجاد رکورد جدید در جدول supporters
        const supporter = this.supporterRepo.create({
            type: req.type,
            status: SupporterStatus.ACTIVE,
            joinDate: new Date().toDateString(),
            //
            province:req.province,
            city:req.city,
            motivation: req.motivation,
            experience: req.experience,
            showInList:req.showInList,
            agreement:req.agreement,
            socialLinks:req.socialLinks,
            user,
        });

        await this.notifService.create({
            type: NotificationType.IN_APP,
            title: 'حامی جدید',
            message: 'یک حامی جدید تایید شد.',
            icon: 'ti ti-user-plus text-blue-600',
            color: 'bg-blue-100',
            panelType: 'hamian',
        });

        return this.supporterRepo.save(supporter);
    }

    // رد درخواست توسط مدیر
    async reject(id: string, notes?: string): Promise<RequestSupporter> {
        const req = await this.findOne(id)

        // حذف آواتار (اگر وجود دارد)
        if (req.avatar) {
            //await this.uploader.deleteFile(req.avatar)
        }

        req.status = RequestSupporterStatus.REJECTED
        req.notes = notes || 'رد توسط مدیر'

        return await this.requestRepo.save(req)
    }
}