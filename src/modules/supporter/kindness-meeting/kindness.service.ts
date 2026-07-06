import {Injectable, NotFoundException} from '@nestjs/common'
import {InjectRepository} from '@nestjs/typeorm'
import {DeepPartial, Repository} from 'typeorm'
import {KindnessMeeting, KindnessStatus, KindnessType} from './kindness-meeting.entity'
import {CreateKindnessMeetingDto} from './dto/create-kindness-meeting.dto'
import {UpdateKindnessMeetingDto} from './dto/update-kindness-meeting.dto'
import type {Express} from 'express'
import { ConfigService } from '@nestjs/config'
import { differenceInDays, parseISO } from 'date-fns'
import {KindnessMeetingResponseDto} from "./dto/kindness-meeting-response.dto";
import {plainToInstance} from "class-transformer";
import * as fs from 'fs'
import * as path from 'path'
import {NotificationType} from "../../../shared/notification/notification.entity";
import {NotificationService} from "../../../shared/notification/notification.service";
import {Donation} from "../donation/donation.entity";
@Injectable()
export class KindnessService {
    constructor(
        private notifService: NotificationService,
        @InjectRepository(Donation)
        private readonly donationRepo: Repository<Donation>,
        @InjectRepository(KindnessMeeting)
        private readonly kindnessRepo: Repository<KindnessMeeting>,
        private readonly configService: ConfigService

    ) {
    }

    async create(dto: CreateKindnessMeetingDto,user, file?: Express.Multer.File) {

        const meeting = this.kindnessRepo.create(this.mapDtoToEntity(dto, file))

        await this.notifService.create({
            userId: user.id,
            type: NotificationType.IN_APP,
            title: 'قرار مهربانی جدید',
            message: 'قرار مهربانی با موفقیت ثبت شد.',
            icon:'ti ti-check text-green-600',
            color:'bg-green-100',
            panelType:'hamian'
        });
        return await this.kindnessRepo.save(meeting)
    }


    async findAll(): Promise<KindnessMeetingResponseDto[]> {
        const meetings = await this.kindnessRepo.find({
            relations: ['donations','category'],
            order: { createdAt: 'DESC' },
        });
        return meetings.map(m => this.toResponseDto(m))
    }
    async findAllRegistrations(meetingId: string): Promise<KindnessMeetingResponseDto[]> {
        const meetings = await this.kindnessRepo.find({
            where:{id:meetingId},
            relations: ['donations','category','registrations'],
            order: { createdAt: 'DESC' },
        });
        return meetings.map(m => this.toResponseDto(m))
    }

    async findOne(id: string): Promise<KindnessMeetingResponseDto> {
        const meeting = await this.kindnessRepo.findOneBy({ id })
        if (!meeting) throw new NotFoundException('قرار مهربانی پیدا نشد')
        return this.toResponseDto(meeting)
    }

    async update(id: string, dto: UpdateKindnessMeetingDto, file?: Express.Multer.File) {
        const meeting = await this.kindnessRepo.findOneBy({ id })
        if (!meeting) throw new NotFoundException('قرار مهربانی پیدا نشد')
        if (file && meeting.image) {
            const imagePath = meeting.image.replace(/^https?:\/\/[^\/]+/, '') // حذف دامنه اگر هست
            const fullPath = path.join(process.cwd(), imagePath)

            // فقط اگر مسیر فایل باشه و وجود داشته باشه، حذف کن
            if (fs.existsSync(fullPath) && fs.lstatSync(fullPath).isFile()) {
                fs.unlinkSync(fullPath)
                console.log('✅ تصویر قبلی حذف شد:', fullPath)
            } else {
                console.log('⚠️ مسیر معتبر نیست یا فایل نیست:', fullPath)
            }
        }

        const updated = this.mapDtoToEntity(dto,file)
        Object.assign(meeting, updated)

        return await this.kindnessRepo.save(meeting)
    }

    async remove(id: string) {
        const meeting = await this.kindnessRepo.findOne({
            where: { id },
            relations: ['donations'] // مطمئن شو donations لود می‌شن
        })
        if (!meeting) throw new NotFoundException('قرار مهربانی پیدا نشد')

        // حذف تصویر
        if (meeting.image) {
            const imagePath = meeting.image.replace(/^https?:\/\/[^\/]+/, '')
            const fullPath = path.join(process.cwd(), imagePath)
            if (fs.existsSync(fullPath) && fs.lstatSync(fullPath).isFile()) {
                fs.unlinkSync(fullPath)
                console.log('تصویر حذف شد:', fullPath)
            }
        }

        // اول donations رو پاک کن
        if (meeting.donations?.length) {
            await this.donationRepo.remove(meeting.donations)
        }

        // بعد خود meeting رو پاک کن
        return await this.kindnessRepo.remove(meeting)
    }

    async toggleStatus(id: string, status: KindnessStatus) {
        const meeting = await this.kindnessRepo.findOneBy({ id })
        if (!meeting) throw new NotFoundException('قرار مهربانی پیدا نشد')

        meeting.status = status
        return await this.kindnessRepo.save(meeting)
    }

    private mapDtoToEntity(
        dto: Partial<CreateKindnessMeetingDto>, file?: Express.Multer.File): DeepPartial<KindnessMeeting> {
        return {
            type: dto.type,
            title: dto.title,
            description: dto.description,
            image: file ? `/uploads/kindness-meetings/${file.filename}` : undefined,
            goal: dto.goal != null ? Number(dto.goal) : undefined,
            current: dto.current != null ? Number(dto.current) : undefined,
            startTime: dto.startTime,
            endTime: dto.endTime,
            location: dto.location,
            startDate: dto.startDate && dto.startDate !== 'undefined' ? dto.startDate : undefined,
            endDate: dto.endDate && dto.endDate !== 'undefined' ? dto.endDate : undefined,
            eventDate: dto.eventDate && dto.eventDate !== 'undefined' ? dto.eventDate : undefined,
            eventTime: dto.eventTime,
            manager: dto.manager,
            status: dto.status,
            category: dto.categoryId ? ({ id: dto.categoryId } as any) : undefined,
            showOnHomepage: this.toBoolean(dto.showOnHomepage),
            showTimer: this.toBoolean(dto.showTimer),
            timerType: dto.timerType,
            timerAlert: this.toBoolean(dto.timerAlert),
            alertDays: dto.alertDays != null ? Number(dto.alertDays) : undefined
        }
    }

    private toBoolean(value: any): boolean {
        if (typeof value === 'boolean') return value
        if (typeof value === 'string') return value.toLowerCase() === 'true'
        return false
    }

    private addImageDomain(meeting: KindnessMeeting): KindnessMeeting {
        const baseUrl = this.configService.get<string>('BASE_URL')
        if (meeting.image && !meeting.image.startsWith('http')) {
            meeting.image = `${baseUrl}${meeting.image}`
        }
        return meeting
    }

    private calculateDuration(start?: string, end?: string): string | null {
        if (!start) return null;
        try {
            // اگر end نبود، تاریخ امروز رو در نظر بگیر
            const endDate = end ? parseISO(end) : new Date();
            const startDate = parseISO(start);

            const days = Math.abs(differenceInDays(endDate, startDate));

            if (days < 1) return 'کمتر از یک روز';
            if (days === 1) return '1 روز';
            if (days < 30) return `${days} روز`;

            const months = Math.floor(days / 30);
            return `${months} ماه`;
        } catch {
            return null;
        }
    }
    private toResponseDto(meeting: KindnessMeeting): KindnessMeetingResponseDto {
        const baseUrl = this.configService.get<string>('BASE_URL')
        const image = meeting.image?.startsWith('http') ? meeting.image : `${baseUrl}${meeting.image}`

        const start = meeting.type === KindnessType.VOLUNTEER ? meeting.eventDate : meeting.startDate
        const end = meeting.endDate ?? ''

        const duration = this.calculateDuration(start, end)

        return plainToInstance(KindnessMeetingResponseDto, {
            ...meeting,
            image,
            duration,
            startDate: start,
            showOnHomepage: Boolean(meeting.showOnHomepage),
            showTimer: Boolean(meeting.showTimer),
            timerAlert: Boolean(meeting.timerAlert)
        })
    }
}