import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ReportEntity } from './report.entity'
import { CreateReportDto} from "./create-report.dto";
import {ReportAdminDto} from "./report-admin.dto";

@Injectable()
export class ReportService {
    constructor(
        @InjectRepository(ReportEntity)
        private readonly reportRepo: Repository<ReportEntity>,
    ) {}

    async create(
        dto: CreateReportDto,
        userId?: string,
    ): Promise<ReportEntity> {
        const report = this.reportRepo.create({
            ...dto,
            userId,
        })

        return this.reportRepo.save(report)
    }

    async findAll() {
        const reports = await this.reportRepo.find({
            order: { createdAt: 'DESC' },
        })

        return reports.map(r => ReportAdminDto.fromEntity(r))
    }

    // داخل ReportService
    async changeStatus(id: string, newStatus: 'pending' | 'resolved' | 'dismissed'): Promise<ReportAdminDto> {
        const report = await this.reportRepo.findOne({ where: { id } });
        if (!report) throw new Error('گزارش یافت نشد');

        report.status = newStatus;
        await this.reportRepo.save(report);

        return ReportAdminDto.fromEntity(report);
    }

    async remove(id: string): Promise<void> {
        await this.reportRepo.delete(id);
    }


}
