import {BadRequestException, Injectable, NotFoundException} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supporter } from './supporter.entity';
import { CreateSupporterDto } from './dto/create-supporter.dto';
import { UpdateSupporterDto } from './dto/update-supporter.dto';
import {User, UserRole} from "../../../shared/user/entities/user.entity";
import * as bcrypt from 'bcrypt';
import {NotificationService} from "../../../shared/notification/notification.service";
import {NotificationType} from "../../../shared/notification/notification.entity";
@Injectable()
export class SupporterService {
    constructor(
        private notifService: NotificationService,
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        @InjectRepository(Supporter)
        private readonly supporterRepo: Repository<Supporter>
    ) {}

    async create(dto: CreateSupporterDto,onlineUser) {
        let user: User | null;

        if (!dto.email && !dto.phone) {
            throw new BadRequestException('ایمیل یا شماره تماس باید وارد شود');
        }

        const rawPassword = dto.password ?? '12345678';
        const hashedPassword = await bcrypt.hash(rawPassword, 10);


        if (dto.userId) {
            user = await this.userRepo.findOneBy({ id: dto.userId });
            if (!user) throw new NotFoundException('کاربر پیدا نشد');
        } else {
            user = await this.userRepo.findOne({
                where: [
                    { email: dto.email },
                    { phoneNumber: dto.phone },
                ],
            });

            if (!user) {
                user = this.userRepo.create({
                    fullName: dto.name,
                    email: dto.email,
                    phoneNumber: dto.phone,
                    password: hashedPassword,
                    legacyRoles: [UserRole.HAMIAN_SUBSCRIBER],
                });
                user = await this.userRepo.save(user);
            }
        }

        if (!user.legacyRoles.includes(UserRole.SUPPORTER_SUBSCRIBER)) {
            user.legacyRoles.push(UserRole.SUPPORTER_SUBSCRIBER);
            await this.userRepo.save(user);
        }

        const existingSupporter = await this.supporterRepo.findOne({
            where: { user: { id: user.id } as any },
        });

        if (existingSupporter) {
            throw new BadRequestException('این کاربر قبلاً به عنوان حامی مالی ثبت شده است');
        }


        const supporter = this.supporterRepo.create({
            type: dto.type,
            joinDate: dto.joinDate,
            status: dto.status,
            initialAmount: dto.initialAmount,
            address: dto.address,
            notes: dto.notes,
            user,
        });

        await this.notifService.create({
            userId: onlineUser.id,
            type: NotificationType.IN_APP,
            title: 'حامی جدید',
            message: 'حامی با موفقیت ثبت شد.',
            icon:'ti ti-user-plus text-blue-600',
            color:'bg-blue-100',
            panelType:'hamian'
        });

        return this.supporterRepo.save(supporter);
    }


    async findAll() {
        return this.supporterRepo.find({
            relations: ['user','donations'],
            order: { createdAt: 'DESC' },
        });
    }

    async findOne(id: string) {
        const supporter = await this.supporterRepo.findOneBy({ id });
        if (!supporter) throw new NotFoundException('حامی پیدا نشد');
        return supporter;
    }

    async update(id: string, dto: UpdateSupporterDto) {

        const supporter = await this.supporterRepo.findOne({
            where: { id },
            relations: ['user']
        })

        if (!supporter) {
            console.error('❌ supporter پیدا نشد')
            throw new NotFoundException('حامی پیدا نشد')
        }

        Object.assign(supporter, {
            type: dto.type ?? supporter.type,
            joinDate: dto.joinDate ?? supporter.joinDate,
            status: dto.status ?? supporter.status,
            initialAmount: dto.initialAmount ?? supporter.initialAmount,
            address: dto.address ?? supporter.address,
            notes: dto.notes ?? supporter.notes
        })

        if (supporter.user) {

            supporter.user.fullName = dto.name ?? supporter.user.fullName
            supporter.user.email = dto.email ?? supporter.user.email
            supporter.user.phoneNumber = dto.phone ?? supporter.user.phoneNumber

            await this.userRepo.save(supporter.user)
            console.log('✅ user با موفقیت ذخیره شد')
        } else {
            console.warn('⚠️ supporter.user وجود ندارد، بروزرسانی انجام نشد')
        }

        const updated = await this.supporterRepo.save(supporter)
        console.log('✅ supporter با موفقیت ذخیره شد:', updated)
        return updated
    }


    async remove(id: string) {
        const supporter = await this.findOne(id);
        return this.supporterRepo.remove(supporter);
    }
}
