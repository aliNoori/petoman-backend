import {Category, ContentType} from "../../shared/category/category.entity";
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

        { title: 'نجات اضطراری', slug: 'rescue', color: '#EF4444', type: kindnessType,contentType: null },
        { title: 'درمان و توانبخشی', slug: 'treatment', color: '#10B981', type: kindnessType,contentType: null },
        { title: 'داستان‌های موفقیت', slug: 'success', color: '#8B5CF6', type: kindnessType,contentType: null },
        { title: 'پناهگاه و نگهداری', slug: 'shelter', color: '#F59E0B', type: kindnessType,contentType: null },
        { title: 'آموزش و آگاهی', slug: 'education', color: '#3B82F6', type: kindnessType,contentType: null },

        { title: 'عمومی', slug: 'general', color: '#6B7280', type: faqType,contentType: null },
        { title: 'حمایت مالی', slug: 'financial-support', color: '#10B981', type: faqType,contentType: null },
        { title: 'رویدادها', slug: 'events', color: '#3B82F6', type: faqType,contentType: null },
        { title: 'داوطلبی', slug: 'volunteering', color: '#8B5CF6', type: faqType,contentType: null },
        { title: 'حیوانات', slug: 'animals', color: '#F59E0B', type: faqType,contentType: null },
        { title: 'پرداخت', slug: 'payment', color: '#E11D48', type: faqType,contentType: null },

        { title: 'نجات اضطراری', slug: 'rescue', color: '#EF4444', type: docType,contentType: null },
        { title: 'درمان و توانبخشی', slug: 'treatment', color: '#10B981', type: docType,contentType: null },
        { title: 'داستان‌های موفقیت', slug: 'success', color: '#8B5CF6', type: docType,contentType: null },
        { title: 'پناهگاه و نگهداری', slug: 'shelter', color: '#F59E0B', type: docType,contentType: null },
        { title: 'آموزش و آگاهی', slug: 'education', color: '#3B82F6', type: docType,contentType: null },

        { title: 'اکشن', slug: 'action', color: '#EF4444', type: filmType,contentType:ContentType.MOVIE },
        { title: 'کمدی', slug: 'comedy', color: '#10B981', type: filmType,contentType:ContentType.SERIES },
        { title: 'درام', slug: 'drama', color: '#3B82F6', type: filmType,contentType:ContentType.MOVIE },


        { title: 'حمایت مالی', slug: 'danim_financial-support', color: '#10B981', type: danimType,contentType: null },
        { title: 'رویدادها', slug: 'danim_events', color: '#3B82F6', type: danimType,contentType: null },
        { title: 'حیوانات', slug: 'danim_animals', color: '#F59E0B', type: danimType,contentType: null },

        { title: 'نجات اضطراری', slug: 'rescue', color: '#EF4444', type: postType,contentType: null },
        { title: 'درمان و توانبخشی', slug: 'treatment', color: '#10B981', type: postType,contentType: null },
        { title: 'داستان‌های موفقیت', slug: 'success', color: '#8B5CF6', type: postType,contentType: null },
        { title: 'پناهگاه و نگهداری', slug: 'shelter', color: '#F59E0B', type: postType,contentType: null },
        { title: 'آموزش و آگاهی', slug: 'education', color: '#3B82F6', type: postType,contentType: null },


    ];

    for (const c of categories) {
        const exist = await categoryRepo.findOne({ where: { slug: c.slug } });
        if (!exist) await categoryRepo.save(categoryRepo.create(c));
    }

    console.log('✅ Categories seeded');
    await AppDataSource.destroy();
}

seed().catch(console.error);