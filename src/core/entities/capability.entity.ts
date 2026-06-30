import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Capability entity
 * High-level feature a tenant can have
 */
@Entity('capabilities')
export class Capability {
    @ApiProperty({ example: 'uuid' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiProperty({ example: 'PRODUCT_MANAGEMENT' })
    @Column({ unique: true })
    name: string;

    @ApiProperty({ example: 'Manage products and inventory' })
    @Column({ nullable: true })
    description: string;
}
