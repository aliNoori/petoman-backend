import { CategoryTypeEntity} from "../../shared/category/category-type.entity";
import {AppDataSource} from "../data-source";
async function seed() {
    await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(CategoryTypeEntity);

    const types = [
        { name: 'kindness-meeting', displayName: 'قرار مهربانی' },
        { name: 'document', displayName: 'مستندات' },
        { name: 'film', displayName: 'فیلم‌ها' },
        { name: 'faq', displayName: 'سؤالات متداول' },
        { name: 'danim', displayName: 'دانیم' },
        { name: 'post', displayName: 'پست' },
    ];

    for (const t of types) {
        const exist = await repo.findOne({ where: { name: t.name } });
        if (!exist) await repo.save(repo.create(t));
    }

    console.log('✅ Category types seeded');
    await AppDataSource.destroy();
}

seed().catch(console.error);