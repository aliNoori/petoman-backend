import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, JoinColumn } from 'typeorm';
import { User} from "../../shared/user/entities/user.entity";
import { Tenant } from './tenant.entity';
import { Role } from './role.entity';
import { ApiProperty } from '@nestjs/swagger';

/**
 * TenantUser entity
 * Links a user to a tenant with a role
 */
@Entity('tenant_users')
export class TenantUser {
    @ApiProperty({ example: 'uuid' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, (user) => user.tenantUsers)
    @JoinColumn({ name: 'userId' })
    user: User;

    @ApiProperty({ example: 'slug for pet-shop' })
    @Column()
    shopId: string;

    @ApiProperty({ example: 'uuid of user' })
    @Column()
    userId: string;

    @ManyToOne(() => Tenant, (tenant) => tenant.tenantUsers)
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;

    @ApiProperty({ example: 'uuid of tenant' })
    @Column()
    tenantId: string;

    @ManyToOne(() => Role)
    @JoinColumn({ name: 'roleId' })
    role: Role;

    @ApiProperty({ example: 'uuid of role' })
    @Column()
    roleId: string;

    @ApiProperty({ example: 'active' })
    @Column({ default: 'active' })
    status: string; // active / invited / blocked
}
