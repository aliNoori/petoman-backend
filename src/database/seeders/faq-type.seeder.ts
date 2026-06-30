import {AppDataSource} from "../data-source";
import {FaqType} from "../../shared/faq/faq-type.entity";
async function seed() {
    await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(FaqType);

    const types = [
        { name: 'hamian', displayName: 'حامیان' },
        { name: 'danim', displayName: 'دانیم' },
        { name: 'film', displayName: 'فیلم‌' },
        { name: 'vet', displayName: 'دامپزشکی' },
        { name: 'market', displayName: 'فروشگاه' },
    ];

    for (const t of types) {
        const exist = await repo.findOne({ where: { name: t.name } });
        if (!exist) await repo.save(repo.create(t));
    }

    console.log('✅ Category types seeded');
    await AppDataSource.destroy();
}

seed().catch(console.error);