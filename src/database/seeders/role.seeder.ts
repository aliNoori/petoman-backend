// src/database/seeds/role.seed.ts
import { DataSource } from 'typeorm';
import { Role } from '../../core/entities/role.entity';
import {BASE_ROLES} from "../../core/config/base-roles.config";

export const ROLES =BASE_ROLES;

export async function seedRoles(dataSource: DataSource) {
    const repo = dataSource.getRepository(Role);

    for (const name of ROLES) {
        const exists = await repo.findOne({ where: { name } });
        if (!exists) {
            await repo.save(repo.create({ name,isSystem:true }));
        }
    }

    console.log('✅ Roles data seeded successfully');
}