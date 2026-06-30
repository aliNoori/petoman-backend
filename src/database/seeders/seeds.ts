import { DataSource } from 'typeorm';
import { seedCapabilities} from "./capability.seeder";
import { seedPermissions} from "./permission.seeder";
import { seedRoles} from "./role.seeder";
import { seedRolePermissions} from "./role-permission.seeder";
import { AppDataSource } from '../data-source';
import {seedCategories} from "./product-tenant-category.seeder";
import {seedReferenceData} from "./reference.seed";
import {seedTenantSpecialties} from "./tenant-specialty.seeder";
import {seedClinicServices} from "./clinic-services.seeder";

async function runSeed() {
    await AppDataSource.initialize();

    await seedCategories(AppDataSource);//Step:01
    await seedRoles(AppDataSource);//Step:02
    await seedPermissions(AppDataSource);//Step:03
    await seedRolePermissions(AppDataSource);//Step:04
    await seedTenantSpecialties(AppDataSource);//Step:05
    await seedClinicServices(AppDataSource);//Step:06
    await seedCapabilities(AppDataSource);//Step:07
    await seedReferenceData(AppDataSource);//Step:08
    await AppDataSource.destroy();
    console.log('✅ Database seeded successfully');
}

runSeed();



//npx ts-node src/database/seeds/seed.ts
// "scripts": {
//     "seed": "ts-node src/database/seeds/seed.ts"
// }
