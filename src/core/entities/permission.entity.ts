import {Entity, PrimaryGeneratedColumn, Column, OneToMany} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import {RolePermission} from "./role-permission.entity";

/**
 * Permission entity
 * Fine-grained operations allowed
 */
@Entity('permissions')
export class Permission {
    @ApiProperty({ example: 'uuid' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiProperty({ example: 'product.create' })
    @Column({ unique: true })
    name: string;

    @ApiProperty({ example: 'افزودن کاربر جدید' })
    @Column({ nullable: true })
    label: string;

    @ApiProperty({ example: 'Allows creating users' })
    @Column({ nullable: true })
    description: string;

    @OneToMany(() => RolePermission, (rp) => rp.permission)
    rolePermissions: RolePermission[];

}
