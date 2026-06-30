import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant} from "../core/entities/tenant.entity";

@Injectable()
export class TenantService {
    constructor(
        @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
    ) {}

    /**
     * Retrieve all tenants
     */
    async findAll(): Promise<Tenant[]> {
        return this.tenantRepo.find({
            relations: ['orders.transaction','orders.items', 'reviews','marketProducts','wallet.transactions'],
        });
    }

    /**
     * Find a single tenant by ID
     */
    async findOne(id: string): Promise<Tenant> {
        const tenant = await this.tenantRepo.findOne({
            where: { id },
            relations: ['tenantUsers', 'tenantCapabilities'],
        });

        if (!tenant) {
            throw new NotFoundException(`Tenant with ID ${id} not found`);
        }

        return tenant;
    }

    /**
     * Delete a tenant
     */
    async remove(id: string): Promise<void> {
        const tenant = await this.findOne(id);
        await this.tenantRepo.remove(tenant);
    }
}