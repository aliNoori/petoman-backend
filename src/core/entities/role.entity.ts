import {Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToMany} from 'typeorm';

import { ApiProperty } from '@nestjs/swagger';
import {RolePermission} from "./role-permission.entity";
import {User} from "../../shared/user/entities/user.entity";

/**
 * Role entity
 * Roles exist only in the context of a tenant
 */
@Entity('roles')
export class Role {
    @ApiProperty({ example: 'uuid' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiProperty({ example: 'ADMIN' })
    @Column({ unique: true })
    name: string;

    @ApiProperty({ example: 'دسترسی کامل به سیستم' })
    @Column({ nullable: true })
    description: string;

    @ApiProperty({ example: 'ti ti-crown' })
    @Column({ default: 'ti ti-shield' })
    icon: string;

    @ApiProperty({ example: '#8b5cf6' })
    @Column({ default: '#8b5cf6' })
    color: string;

    @ApiProperty({ example: false })
    @Column({ default: false })
    isSystem: boolean;

    @ApiProperty({ example: 5 })
    @Column({ default: 0 })
    usersCount: number;

    @OneToMany(() => RolePermission, (rp) => rp.role)
    rolePermissions: RolePermission[];

    @ManyToMany(() => User, (user) => user.roles)
    users: User[];
}
