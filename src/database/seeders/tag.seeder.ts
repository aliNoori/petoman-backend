import {AppDataSource} from "../data-source";
import {ContentType, Tag} from "../../shared/tag/tag.entity";
import {TagType} from "../../shared/tag/tag-type.entity";

async function seed() {
    await AppDataSource.initialize();

    const tagRepo = AppDataSource.getRepository(Tag);
    const typeRepo = AppDataSource.getRepository(TagType);

    const faqType   = await typeRepo.findOneBy({ name: "faq" });
    const docType   = await typeRepo.findOneBy({ name: "document" });
    const filmType  = await typeRepo.findOneBy({ name: "film" });
    const danimType = await typeRepo.findOneBy({ name: "danim" });
    const postType  = await typeRepo.findOneBy({ name: "post" });

    if (!faqType || !docType || !filmType || !danimType || !postType) {
        throw new Error("Tag types must be seeded first");
    }

    const tags = [
        // -------- FAQ --------
        { name: "عمومی", slug: "faq_general", description: "سوالات عمومی و پایه", color: "#6B7280", type: faqType },
        { name: "حامی مالی", slug: "faq_financial_support", description: "سوالات مربوط به حمایت مالی", color: "#10B981", type: faqType },
        { name: "رویدادها", slug: "faq_events", description: "سوالات مرتبط با رویدادها", color: "#3B82F6", type: faqType },
        { name: "داوطلبی", slug: "faq_volunteering", description: "سوالات همکاری داوطلبانه", color: "#8B5CF6", type: faqType },
        { name: "حیوانات", slug: "faq_animals", description: "سوالات مرتبط با حیوانات", color: "#F59E0B", type: faqType },
        { name: "پرداخت", slug: "faq_payment", description: "سوالات مربوط به پرداخت‌ها", color: "#E11D48", type: faqType },

        // -------- DOCUMENT --------
        { name: "نجات", slug: "doc_rescue", description: "مطالب مربوط به نجات اضطراری", color: "#EF4444",contentType: ContentType.HAMIAN, type: docType },
        { name: "درمان", slug: "doc_treatment", description: "مطالب درمان، توانبخشی و مراقبت", color: "#10B981",contentType: ContentType.HAMIAN, type: docType },
        { name: "موفقیت", slug: "doc_success", description: "گزارش‌ها و داستان‌های موفقیت", color: "#8B5CF6",contentType: ContentType.HAMIAN, type: docType },
        { name: "پناهگاه", slug: "doc_shelter", description: "مطالب مرتبط با نگهداری و پناهگاه", color: "#F59E0B",contentType: ContentType.HAMIAN, type: docType },
        { name: "آموزش", slug: "doc_education", description: "محتوای آموزشی و آگاه‌سازی", color: "#3B82F6",contentType: ContentType.HAMIAN, type: docType },

        // -------- FILM --------
        { name: "اکشن", slug: "film_action", description: "فیلم‌های ژانر اکشن", color: "#EF4444", contentType: ContentType.MOVIE, type: filmType },
        { name: "کمدی", slug: "film_comedy", description: "فیلم‌ها و سریال‌های کمدی", color: "#10B981", contentType: ContentType.SERIES, type: filmType },
        { name: "درام", slug: "film_drama", description: "محتوای درام (فیلم + سریال)", color: "#3B82F6", contentType: ContentType.BOTH, type: filmType },

        // -------- DANIM --------
        { name: "حمایت مالی", slug: "danim_financial_support", description: "حمایت مالی در دنیم", color: "#10B981", type: danimType },
        { name: "حوادث", slug: "danim_events", description: "رویدادهای دنیم", color: "#3B82F6", type: danimType },
        { name: "حیوانات اهلی", slug: "danim_animals", description: "محتوای حیوانات در دنیم", color: "#F59E0B", type: danimType },

        // -------- POST --------
        { name: "نجات اضطراری", slug: "post_rescue", description: "پست‌های نجات اضطراری", color: "#EF4444", contentType: ContentType.DANIM, type: postType },
        { name: "درمان و توانبخشی", slug: "post_treatment", description: "پست‌های درمان و توانبخشی", color: "#10B981",contentType: ContentType.DANIM, type: postType },
        { name: "داستان‌های موفقیت", slug: "post_success", description: "پست‌های موفقیت‌آمیز", color: "#8B5CF6",contentType: ContentType.DANIM, type: postType },
        { name: "پناهگاه و نگهداری", slug: "post_shelter", description: "مطالب مرتبط با پناهگاه", color: "#F59E0B",contentType: ContentType.DANIM, type: postType },
        { name: "آموزش و آگاهی", slug: "post_education", description: "آموزشی و آگاه‌سازی", color: "#3B82F6",contentType: ContentType.DANIM, type: postType },
    ];

    for (const t of tags) {
        const exist = await tagRepo.findOne({ where: { slug: t.slug } });
        if (!exist) await tagRepo.save(tagRepo.create(t));
    }

    console.log("✅ Tags seeded successfully with Enum contentType");
    await AppDataSource.destroy();
}

seed().catch(console.error);