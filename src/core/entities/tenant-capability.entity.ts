// src/core/entities/tenant-capability.entity.ts
import {Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Capability } from './capability.entity';
import { ApiProperty } from '@nestjs/swagger';

/**
 * TenantCapability entity
 * Assigns capabilities to a tenant
 */
@Entity('tenant_capabilities')
export class TenantCapability {
    @ApiProperty({ example: 'uuid' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Tenant, (tenant) => tenant.tenantCapabilities)
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;

    @ApiProperty({ example: 'uuid of tenant' })
    @Column()
    tenantId: string;

    @ManyToOne(() => Capability)
    @JoinColumn({ name: 'capabilityId' })
    capability: Capability;

    @ApiProperty({ example: 'uuid of capability' })
    @Column()
    capabilityId: string;
}
