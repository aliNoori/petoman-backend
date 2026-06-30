import { Injectable } from '@nestjs/common';
import {DataSource, IsNull, Not} from 'typeorm';


import {TenantContext} from "../../../tenants/tenant-context.service";
import {TenantCategory} from "./tenant-category.entity";
import {CreateTenantCategoryDto} from "./dto/create-tenant-category.dto";

@Injectable()
export class TenantCategoryService {
    constructor(
        private readonly dataSource: DataSource,
        private readonly tenantContext: TenantContext,
    ) {}

    /**
     * Create a new category for current tenant
     */
    async createCategory(dto: CreateTenantCategoryDto): Promise<TenantCategory> {
        const tenantId = this.tenantContext.getTenantId();

        const category = this.dataSource.getRepository(TenantCategory).create({
            ...dto,
            tenantId,
        });

        return this.dataSource.getRepository(TenantCategory).save(category);
    }

    /**
     * Get all categories for current tenant
     */
    async getCategories(): Promise<TenantCategory[]> {
        const tenantId = this.tenantContext.getTenantId();

        return this.dataSource.getRepository(TenantCategory).find({
            //where: { tenantId },
            order: { createdAt: 'ASC' },
        });
    }

}
