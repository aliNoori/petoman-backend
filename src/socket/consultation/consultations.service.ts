// src/consultations/consultations.service.ts
import {ForbiddenException, Injectable, NotFoundException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {DataSource, Repository} from 'typeorm';
import {Consultation, ConsultationStatus} from "./consultation.entity";
import {CreateConsultationDto} from "./create-consultation.dto";
import {Appointment, AppointmentStatus} from "../../modules/vet&clinic/entities/appointment.entity";
import {AppointmentQueue, QueueStatus} from "../../modules/vet&clinic/appointment/entities/appointment-queue.entity";

@Injectable()
export class ConsultationsService {
    constructor(
        private dataSource: DataSource,
        @InjectRepository(Consultation)
        private consultationsRepository: Repository<Consultation>,

    ) {}

    // ایجاد مشاوره جدید (بعد از پرداخت)
    async create(userId: string, createConsultationDto: CreateConsultationDto) {
        const consultation = this.consultationsRepository.create({
            userId,
            tenantId: createConsultationDto.doctorId,
            status: ConsultationStatus.REQUEST_SENT,
            unreadCount: 0,
        });
        return await this.consultationsRepository.save(consultation);
    }

    // دریافت لیست مشاوره‌های کاربر لاگین شده
    async findAllForUser(userId: string) {
        return this.consultationsRepository.find({
            where: { userId },
            relations: ['doctor.tenantSettings','user','pet','messages'], // برای نمایش نام دکتر در لیست
            order: { updatedAt: 'DESC' },
        });
    }

    // دریافت لیست مشاوره‌های دکتر لاگین شده
    async findAllForDoctor(doctorId: number) {
        return this.consultationsRepository.find({
            where: { doctorId },
            relations: ['user'], // برای نمایش نام کاربر در لیست
            order: { updatedAt: 'DESC' },
        } as any);
    }

    // پیدا کردن یک مشاوره با جزئیات
    async findOne(id: string) {
        const consultation = await this.consultationsRepository.findOne({
            where: { id },
            relations: ['user', 'doctor'],
        });

        if (!consultation) {
            throw new NotFoundException('مشاوره یافت نشد');
        }
        return consultation;
    }

    // تایید مشاوره توسط دکتر
    async approve(id: string, doctorId: string) {
        const consultation = await this.findOne(id);

        // بررسی اینکه آیا این دکتر صاحب این مشاوره است
        /* if (consultation.tenantId !== doctorId) {
             throw new ForbiddenException('شما اجازه دسترسی به این مشاوره را ندارید');
         }*/
        //TODO:remove comment in production and find tenantId

        if (consultation.status === ConsultationStatus.ACTIVE) {
            throw new ForbiddenException('این مشاوره قبلاً تایید یا رد شده است');
        }

        consultation.status = ConsultationStatus.ACTIVE;
        consultation.requestStatus=ConsultationStatus.CONFIRMED
        return await this.consultationsRepository.save(consultation)
    }

    // بستن مشاوره
    async close(data: any) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. آپدیت وضعیت مشاوره
            const consultation = await this.consultationsRepository.findOne({
                where: { id: data.consultationId },
            });

            if (!consultation) {
                throw new NotFoundException('مشاوره یافت نشد');
            }

            consultation.status = ConsultationStatus.CLOSED;
            consultation.note = data.note;
            consultation.review = data.review;
            consultation.rating = data.rating;

            // 2. محاسبه Duration (مدت زمان)
            let durationMinutes = 0;
            const MessageRepository = queryRunner.manager.getRepository('Message'); // نام Entity پیام شما

            // پیدا کردن اولین و آخرین پیام در این مشاوره
            const firstMessage = await MessageRepository.findOne({
                where: { consultationId: consultation.id },
                order: { sentAt: 'ASC' } // اولین پیام
            });

            const lastMessage = await MessageRepository.findOne({
                where: { consultationId: consultation.id },
                order: { sentAt: 'DESC' } // آخرین پیام
            });

            if (firstMessage && lastMessage) {
                // محاسبه اختلاف زمانی به میلی‌ثانیه
                const diffInMs = lastMessage.sentAt.getTime() - firstMessage.sentAt.getTime();
                // تبدیل به دقیقه
                durationMinutes = Math.round(diffInMs / (1000 * 60));
            }

            // 3. آپدیت وضعیت Appointment
            const appointmentRepository = queryRunner.manager.getRepository(Appointment);
            const appointment = await appointmentRepository.findOne({
                where: { consultationId: consultation.id },
                order: { createdAt: 'DESC' },
            });

            if (appointment) {
                appointment.status = AppointmentStatus.COMPLETED;

                // ✅ آپشنال: اگر می‌خواهید duration را در دیتابیس ذخیره کنید، خط زیر را فعال کنید
                appointment.duration = String(durationMinutes);

                await appointmentRepository.save(appointment);

                // 4. آپدیت وضعیت Queue
                const appointmentQRepository = queryRunner.manager.getRepository(AppointmentQueue);
                const appointmentQueue = await appointmentQRepository.findOne({
                    where: { appointmentId: appointment.id },
                    order: { createdAt: 'DESC' },
                });

                if (appointmentQueue) {
                    appointmentQueue.status = QueueStatus.COMPLETED;
                    await appointmentQRepository.save(appointmentQueue);
                }
            }

            // 5. ذخیره نهایی مشاوره
            await this.consultationsRepository.save(consultation);

            await queryRunner.commitTransaction();

            // ✅ برگرداندن duration محاسبه شده به کلاینت (اختیاری)
            return {
                ...consultation,
                calculatedDuration: durationMinutes
            };

        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }
}