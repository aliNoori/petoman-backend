import { Category} from "../../shared/category/category.entity";
import { CategoryTypeEntity} from "../../shared/category/category-type.entity";
import {AppDataSource} from "../data-source";
async function seed() {
    await AppDataSource.initialize();
    const categoryRepo = AppDataSource.getRepository(Category);
    const typeRepo = AppDataSource.getRepository(CategoryTypeEntity);

    const faqType = await typeRepo.findOneBy({ name: 'faq' });
    const kindnessType = await typeRepo.findOneBy({ name: 'kindness-meeting' });
    const docType = await typeRepo.findOneBy({ name: 'document' });
    const filmType = await typeRepo.findOneBy({ name: 'film' });
    const danimType = await typeRepo.findOneBy({ name: 'danim' });
    const postType = await typeRepo.findOneBy({ name: 'post' });

    if (!faqType || !docType || !filmType || !danimType|| !postType||!kindnessType) throw new Error('Category types must be seeded first');

    const categories = [

        { title: 'نجات اضطراری', slug: 'rescue', color: '#EF4444', type: kindnessType },
        { title: 'درمان و توانبخشی', slug: 'treatment', color: '#10B981', type: kindnessType },
        { title: 'داستان‌های موفقیت', slug: 'success', color: '#8B5CF6', type: kindnessType },
        { title: 'پناهگاه و نگهداری', slug: 'shelter', color: '#F59E0B', type: kindnessType },
        { title: 'آموزش و آگاهی', slug: 'education', color: '#3B82F6', type: kindnessType },

        { title: 'عمومی', slug: 'general', color: '#6B7280', type: faqType },
        { title: 'حمایت مالی', slug: 'financial-support', color: '#10B981', type: faqType },
        { title: 'رویدادها', slug: 'events', color: '#3B82F6', type: faqType },
        { title: 'داوطلبی', slug: 'volunteering', color: '#8B5CF6', type: faqType },
        { title: 'حیوانات', slug: 'animals', color: '#F59E0B', type: faqType },
        { title: 'پرداخت', slug: 'payment', color: '#E11D48', type: faqType },

        { title: 'نجات اضطراری', slug: 'rescue', color: '#EF4444', type: docType },
        { title: 'درمان و توانبخشی', slug: 'treatment', color: '#10B981', type: docType },
        { title: 'داستان‌های موفقیت', slug: 'success', color: '#8B5CF6', type: docType },
        { title: 'پناهگاه و نگهداری', slug: 'shelter', color: '#F59E0B', type: docType },
        { title: 'آموزش و آگاهی', slug: 'education', color: '#3B82F6', type: docType },

        { title: 'اکشن', slug: 'action', color: '#EF4444', type: filmType },
        { title: 'کمدی', slug: 'comedy', color: '#10B981', type: filmType },
        { title: 'درام', slug: 'drama', color: '#3B82F6', type: filmType },


        { title: 'حمایت مالی', slug: 'danim_financial-support', color: '#10B981', type: danimType },
        { title: 'رویدادها', slug: 'danim_events', color: '#3B82F6', type: danimType },
        { title: 'حیوانات', slug: 'danim_animals', color: '#F59E0B', type: danimType },

        { title: 'نجات اضطراری', slug: 'rescue', color: '#EF4444', type: postType },
        { title: 'درمان و توانبخشی', slug: 'treatment', color: '#10B981', type: postType },
        { title: 'داستان‌های موفقیت', slug: 'success', color: '#8B5CF6', type: postType },
        { title: 'پناهگاه و نگهداری', slug: 'shelter', color: '#F59E0B', type: postType },
        { title: 'آموزش و آگاهی', slug: 'education', color: '#3B82F6', type: postType },


    ];

    for (const c of categories) {
        const exist = await categoryRepo.findOne({ where: { slug: c.slug } });
        if (!exist) await categoryRepo.save(categoryRepo.create(c));
    }

    console.log('✅ Categories seeded');
    await AppDataSource.destroy();
}

seed().catch(console.error);