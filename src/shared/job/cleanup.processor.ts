import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { DataSource } from 'typeorm';
import { TemporarySlotReservation, ReservationStatus} from "../../modules/vet&clinic/appointment/entities/temporary-slot-reservation.entity";
import {AppointmentQueue, QueueStatus} from "../../modules/vet&clinic/appointment/entities/appointment-queue.entity";

@Processor('cleanup')
@Injectable()
export class CleanupProcessor {
    private readonly logger = new Logger(CleanupProcessor.name);

    constructor(
        private readonly dataSource: DataSource,
    ) {}

    @Process('cleanup-reservation')
    async handleCleanupReservation(job: Job<{ reservationId: string }>) {
        this.logger.debug(`Processing cleanup for reservation: ${job.data.reservationId}`);

        const { reservationId } = job.data;

        try {
            const repository = this.dataSource.getRepository(TemporarySlotReservation);

            const reservation = await repository.findOne({
                where: { id: reservationId }
            });

            if (!reservation) {
                this.logger.warn(`Reservation ${reservationId} not found for cleanup`);
                return { success: false, reason: 'RESERVATION_NOT_FOUND' };
            }

            // اگر هنوز ACTIVE است → منقضی کن
            if (reservation.status === ReservationStatus.ACTIVE) {
                reservation.status = ReservationStatus.EXPIRED;
                await repository.save(reservation);
                this.logger.log(`🧹 رزرو موقت ${reservationId} منقضی شد و آزاد شد`);
                return { success: true, action: 'EXPIRED', reservationId };
            }

            // اگر قبلاً تأیید یا لغو شده → کاری نکن
            this.logger.debug(`Reservation ${reservationId} already resolved (status: ${reservation.status})`);
            return { success: true, action: 'ALREADY_RESOLVED', reservationId };

        } catch (error) {
            this.logger.error(`Failed to cleanup reservation ${reservationId}:`, error);
            throw error;
        }
    }

    @Process('cleanup-queue')
    async handleCleanupQueue(job: Job<{ queueId: string }>) {
        this.logger.debug(`Processing cleanup for queue entry: ${job.data.queueId}`);

        const { queueId } = job.data;

        try {
            const queueRepo = this.dataSource.getRepository(AppointmentQueue);

            const queueEntry = await queueRepo.findOne({
                where: { id: queueId }
            });

            if (!queueEntry) {
                return { success: false, reason: 'QUEUE_ENTRY_NOT_FOUND' };
            }

            if (queueEntry.status === QueueStatus.WAITING) {
                queueEntry.status = QueueStatus.EXPIRED;
                queueEntry.resolvedAt = new Date();
                await queueRepo.save(queueEntry);
                this.logger.log(`🧹 رکورد صف ${queueId} منقضی شد`);
                return { success: true, action: 'EXPIRED', queueId };
            }

            return { success: true, action: 'ALREADY_RESOLVED', queueId };

        } catch (error) {
            this.logger.error(`Failed to cleanup queue entry ${queueId}:`, error);
            throw error;
        }
    }

    @OnQueueActive()
    onActive(job: Job) {
        this.logger.debug(`Processing job ${job.id} of type ${job.name}`);
    }

    @OnQueueCompleted()
    onCompleted(job: Job, result: any) {
        this.logger.debug(`Completed job ${job.id} with result: ${JSON.stringify(result)}`);
    }

    @OnQueueFailed()
    onFailed(job: Job, error: Error) {
        this.logger.error(`Failed job ${job.id}: ${error.message}`);
    }
}