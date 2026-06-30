import {BadRequestException, ForbiddenException, Injectable, NotFoundException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {Contract, ContractStatus} from "../../core/entities/contract.entity";
import {AuditLog, TenantRequest} from "../request/entities/tenant-request.entity";
import {CreateContractDto, UpdateContractStatusDto} from "./create-contract.dto";
import {User} from "../user/entities/user.entity";

@Injectable()
export class ContractService {
    constructor(
        @InjectRepository(Contract)
        private contractRepo: Repository<Contract>,
        @InjectRepository(TenantRequest)
        private tenantRequestRepo: Repository<TenantRequest>,
    ) {}

    async createContract(dto: CreateContractDto, user: User) {
        // ۱. بررسی وجود درخواست مستأجر
        const tenantRequest = await this.tenantRequestRepo.findOne({
            where: { id: dto.tenantRequestId, userId: user.id },
        });

        if (!tenantRequest) {
            throw new NotFoundException('Tenant request not found');
        }

        // ۲. بررسی وضعیت درخواست (فقط درخواست‌های تایید شده یا در حال بررسی می‌توانند قرارداد ببندند)
        if (tenantRequest.status !== 'approved' && tenantRequest.status !== 'pending') {
            throw new BadRequestException('Tenant request is not eligible for contract creation');
        }

        // ۳. بررسی اینکه آیا قبلاً قراردادی برای این درخواست ایجاد شده است یا خیر
        const existingContract = await this.contractRepo.findOne({
            where: { tenantRequestId: dto.tenantRequestId },
        });

        if (existingContract) {
            throw new BadRequestException('Contract already exists for this request');
        }

        // ۴. ایجاد قرارداد جدید
        const newContract = this.contractRepo.create({
            tenantRequestId: dto.tenantRequestId,
            userId: user.id,
            contractData: dto.contractData || {},
            status: ContractStatus.DRAFT,
        });

        const savedContract = await this.contractRepo.save(newContract);

        // ۵. آپدیت کردن TenantRequest با ID قرارداد
        tenantRequest.contractId = savedContract.id;
        await this.tenantRequestRepo.save(tenantRequest);

        return {
            success: true,
            message: 'Contract created successfully',
            data: savedContract,
        };
    }

    async findOne(id: string) {
        const contract = await this.contractRepo.findOne({
            where: { id },
            relations: ['tenantRequest', 'user'],
        });

        if (!contract) {
            throw new NotFoundException('Contract not found');
        }

        return contract;
    }

    async updateContractStatus(id: string, dto: UpdateContractStatusDto, user: User) {
        const contract = await this.contractRepo.findOne({
            where: { id },
            relations: ['tenantRequest', 'user'],
        });

        if (!contract) {
            throw new NotFoundException('Contract not found');
        }

        if (contract.userId !== user.id && !user.roles?.some(role => role.name === 'SUPER_ADMIN')) {
            throw new ForbiddenException('You do not have permission to update this contract');
        }

        // منطق تغییر وضعیت
        if (dto.status === ContractStatus.SIGNED) {
            if (!dto.signedDocumentUrl) {
                throw new BadRequestException('Signed document URL is required for signing');
            }
            contract.status = ContractStatus.SIGNED;
            contract.signedAt = new Date();
            contract.signedDocuments = {
                ...contract.signedDocuments,
                tenantSignature: dto.signedDocumentUrl,
            };

            // آپدیت وضعیت TenantRequest به Approved نهایی
            if (contract.tenantRequest) {
                contract.tenantRequest.status = 'approved';
                await this.tenantRequestRepo.save(contract.tenantRequest);
            }
        } else if (dto.status === ContractStatus.TERMINATED || dto.status === ContractStatus.REJECTED) {
            contract.status = ContractStatus.TERMINATED;
            contract.rejectionReason = dto.rejectionReason;
        } else {
            contract.status = dto.status;
        }

        return this.contractRepo.save(contract);
    }

    async getContractAuditLog(user: User,deviceInfo?:any) {

        const auditLog: AuditLog = {
            userId: user.id,
            acceptedIp: deviceInfo.ip,
            contractVersion: '1.0.3',
            userAgent: deviceInfo.userAgent,
            commissionRate:'15'//TODO:change to real
        };

        return auditLog
    }
}