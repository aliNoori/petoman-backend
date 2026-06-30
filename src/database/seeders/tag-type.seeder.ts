import {AppDataSource} from "../data-source";
import {TagType} from "../../shared/tag/tag-type.entity";
async function seed() {
    await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(TagType);

    const types = [
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

    console.log('✅ Tag types seeded');
    await AppDataSource.destroy();
}

seed().catch(console.error);