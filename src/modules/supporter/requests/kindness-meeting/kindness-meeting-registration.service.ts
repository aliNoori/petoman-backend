import {BadRequestException, Injectable, NotFoundException} from "@nestjs/common";
import {CreateKindnessMeetingRegistrationDto} from "./create-kindness-meeting-registration.dto";
import {KindnessMeetingRegistration} from "./kindness-meeting-registration.entity";
import {InjectRepository} from "@nestjs/typeorm";
import {Repository} from "typeorm";
import {KindnessMeeting} from "../../kindness-meeting/kindness-meeting.entity";

@Injectable()
export class KindnessMeetingRegistrationService {
    constructor(
        @InjectRepository(KindnessMeeting)
        private readonly meetingRepo: Repository<KindnessMeeting>,

        @InjectRepository(KindnessMeetingRegistration)
        private readonly regRepo: Repository<KindnessMeetingRegistration>,
    ) {}

    async register(
        meetingId: string,
        dto: CreateKindnessMeetingRegistrationDto,
    ) {
        const meeting = await this.meetingRepo.findOneBy({ id: meetingId })
        if (!meeting) {
            throw new NotFoundException('قرار مهربانی یافت نشد')
        }

        if (
            dto.helpType === 'financial' &&
            meeting.type !== 'financial'
        ) {
            throw new BadRequestException('این قرار مالی نیست')
        }

        if (dto.helpType === 'financial' && !dto.amount) {
            throw new BadRequestException('مبلغ کمک الزامی است')
        }

        const reg = this.regRepo.create({
            ...dto,
            kindnessMeeting: meeting,
        })

        return this.regRepo.save(reg)
    }

    /*async list(/!*meetingId: string*!/) {
        return this.regRepo.find({
            /!*where: { kindnessMeeting: { id: meetingId } },*!/
            order: { createdAt: 'DESC' },
        } as any)
    }*/
    async list(/*meetingId: string*/) {
        return this.regRepo.find({
            order: { createdAt: 'DESC' },
            relations: ['kindnessMeeting'],
        } as any)
    }
}