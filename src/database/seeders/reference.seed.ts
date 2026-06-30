// src/database/seeds/reference.seed.ts
import { DataSource } from 'typeorm';
import { Animal } from "../../shared/refrences/entities/animal.entity";
import { Brand } from '../../shared/refrences/entities/brand.entity';
import { Attribute } from '../../shared/refrences/entities/attribute.entity';

// ────────────── Mock Data ──────────────
const DATA = {
    animals: [
        { slug: "dog", name: "سگ", icon: "🐕", code: "D" },
        { slug: "cat", name: "گربه", icon: "🐱", code: "C" },
        { slug: "bird", name: "پرنده", icon: "🦜", code: "B" },
        { slug: "fish", name: "ماهی", icon: "🐠", code: "F" },
        { slug: "rabbit", name: "خرگوش", icon: "🐰", code: "R" },
        { slug: "hamster", name: "همستر", icon: "🐹", code: "H" },
        { slug: "turtle", name: "لاک‌پشت", icon: "🐢", code: "T" },
        { slug: "parrot", name: "طوطی", icon: "🦜", code: "P" },
        { slug: "reptile", name: "خزنده", icon: "🦎", code: "X" }
    ],
    // لیست یکتای برندها (بدون تکرار)
    brands: [
        { slug: "royal-canin", name: "رویال کنین", code: "RC" },
        { slug: "reflex", name: "رفلکس", code: "RF" },
        { slug: "whiskas", name: "ویسکاس", code: "WS" },
        { slug: "proplan", name: "پروپلن", code: "PP" },
        { slug: "brit", name: "بریت", code: "BR" },
        { slug: "monge", name: "مونژه", code: "MG" },
        { slug: "farmina", name: "فارمینا", code: "FM" },
        { slug: "gourmet", name: "گورمت", code: "GM" },
        { slug: "sheba", name: "شبا", code: "SH" },
        { slug: "felix", name: "فلیکس", code: "FX" },
        { slug: "persian", name: "پرشین", code: "PR" },
        { slug: "pedigree", name: "پدیگری", code: "PD" },
        { slug: "equilibrio", name: "اکولیبریو", code: "EQ" },
        { slug: "acana", name: "آکانا", code: "AC" },
        { slug: "orijen", name: "اوریجن", code: "OR" },
        { slug: "taste-wild", name: "تیست آف وایلد", code: "TW" },
        { slug: "hill", name: "هیلز", code: "HL" },
        { slug: "natures", name: "نیچرز", code: "NT" }
    ],
    // نگاشت برندها به حیوانات
    animal_brands: {
        cat: ["royal-canin", "reflex", "whiskas", "proplan", "brit", "monge", "farmina", "gourmet", "sheba", "felix", "persian"],
        dog: ["royal-canin", "reflex", "pedigree", "proplan", "equilibrio", "brit", "monge", "farmina", "acana", "orijen", "taste-wild", "hill"],
        bird: ["natures", "reflex"],
        parrot: ["natures", "reflex"],
        fish: ["natures"],
        rabbit: ["natures", "reflex"],
        hamster: ["natures", "reflex"],
        turtle: ["natures"],
        reptile: ["natures"]
    },
    // لیست یکتای ویژگی‌ها (بدون تکرار)
    attributes: [
        { slug: "chicken", name: "طعم مرغ", type: "taste" },
        { slug: "beef", name: "طعم گوشت گاو", type: "taste" },
        { slug: "fish", name: "طعم ماهی", type: "taste" },
        { slug: "salmon", name: "طعم سالمون", type: "taste" },
        { slug: "tuna", name: "طعم تن‌ماهی", type: "taste" },
        { slug: "liver", name: "طعم جگر", type: "taste" },
        { slug: "ocean-fish", name: "طعم ماهی اقیانوسی", type: "taste" },
        { slug: "lamb", name: "طعم گوسفند", type: "taste" },
        { slug: "turkey", name: "طعم بوقلمون", type: "taste" },
        { slug: "duck", name: "طعم اردک", type: "taste" },
        { slug: "kitten", name: "بچه گربه", type: "age" },
        { slug: "junior", name: "جوان", type: "age" },
        { slug: "adult", name: "بالغ", type: "age" },
        { slug: "senior", name: "مسن", type: "age" },
        { slug: "puppy", name: "توله", type: "age" },
        { slug: "mini", name: "مینی", type: "size" },
        { slug: "small-breed", name: "نژاد کوچک", type: "size" },
        { slug: "medium-breed", name: "نژاد متوسط", type: "size" },
        { slug: "large-breed", name: "نژاد بزرگ", type: "size" },
        { slug: "giant-breed", name: "نژاد غول‌پیکر", type: "size" },
        { slug: "85g", name: "85 گرم", type: "weight" },
        { slug: "100g", name: "100 گرم", type: "weight" },
        { slug: "150g", name: "150 گرم", type: "weight" },
        { slug: "200g", name: "200 گرم", type: "weight" },
        { slug: "400g", name: "400 گرم", type: "weight" },
        { slug: "500g", name: "500 گرم", type: "weight" },
        { slug: "1kg", name: "1 کیلوگرم", type: "weight" },
        { slug: "2kg", name: "2 کیلوگرم", type: "weight" },
        { slug: "3kg", name: "3 کیلوگرم", type: "weight" },
        { slug: "4kg", name: "4 کیلوگرم", type: "weight" },
        { slug: "5kg", name: "5 کیلوگرم", type: "weight" },
        { slug: "10kg", name: "10 کیلوگرم", type: "weight" },
        { slug: "15kg", name: "15 کیلوگرم", type: "weight" },
        { slug: "20kg", name: "20 کیلوگرم", type: "weight" },
        { slug: "pouch", name: "پوچ", type: "packaging" },
        { slug: "can", name: "قوطی", type: "packaging" },
        { slug: "bag", name: "کیسه", type: "packaging" },
        { slug: "box", name: "جعبه", type: "packaging" },
        { slug: "pack-6", name: "بسته 6 عددی", type: "packaging" },
        { slug: "pack-12", name: "بسته 12 عددی", type: "packaging" },
        { slug: "sterilized", name: "عقیم شده", type: "special" },
        { slug: "indoor", name: "آپارتمانی", type: "special" },
        { slug: "hairball", name: "ضد گلوله مو", type: "special" },
        { slug: "sensitive", name: "حساس", type: "special" },
        { slug: "dental", name: "سلامت دندان", type: "special" },
        { slug: "skin-coat", name: "سلامت پوست و مو", type: "special" },
        { slug: "light", name: "کم کالری", type: "special" },
        { slug: "grain-free", name: "بدون غلات", type: "special" },
        { slug: "natural", name: "طبیعی", type: "special" },
        { slug: "organic", name: "ارگانیک", type: "special" },
        { slug: "hypoallergenic", name: "ضد حساسیت", type: "special" },
        { slug: "joint", name: "سلامت مفاصل", type: "special" },
        { slug: "digestion", name: "سلامت گوارش", type: "special" }
    ],
    // نگاشت ویژگی‌ها به حیوانات
    animal_attributes: {
        cat: {
            taste: ["chicken", "beef", "fish", "salmon", "tuna", "liver", "ocean-fish"],
            age: ["kitten", "junior", "adult", "senior"],
            weight: ["85g", "100g", "150g", "200g", "400g", "500g", "1kg", "2kg", "3kg", "4kg", "10kg"],
            packaging: ["pouch", "can", "bag", "pack-6", "pack-12"],
            special: ["sterilized", "indoor", "hairball", "sensitive", "dental", "skin-coat", "light", "grain-free", "natural"]
        },
        dog: {
            taste: ["chicken", "beef", "lamb", "turkey", "salmon", "duck", "liver"],
            size: ["mini", "small-breed", "medium-breed", "large-breed", "giant-breed"],
            age: ["puppy", "junior", "adult", "senior"],
            weight: ["400g", "1kg", "3kg", "5kg", "10kg", "15kg", "20kg"],
            packaging: ["can", "bag", "pack-6", "pack-12"],
            special: ["light", "sensitive", "joint", "digestion", "skin-coat", "dental", "grain-free", "hypoallergenic", "natural"]
        },
        bird: {
            weight: ["400g", "500g", "1kg", "2kg"],
            packaging: ["bag", "box"],
            special: ["natural", "organic"]
        },
        parrot: {
            weight: ["500g", "1kg", "2kg"],
            packaging: ["bag", "box"],
            special: ["natural", "organic"]
        },
        fish: {
            weight: ["100g", "200g", "500g"],
            packaging: ["can", "bag"]
        },
        rabbit: {
            weight: ["500g", "1kg", "3kg"],
            packaging: ["bag"],
            special: ["natural"]
        },
        hamster: {
            weight: ["400g", "500g", "1kg"],
            packaging: ["bag"],
            special: ["natural"]
        }
    }
};

export async function seedReferenceData(dataSource: DataSource) {
    const animalRepo = dataSource.getRepository(Animal);
    const brandRepo = dataSource.getRepository(Brand);
    const attributeRepo = dataSource.getRepository(Attribute);

    // 1. Seed Animals (First)
    console.log('🌱 Seeding Animals...');
    for (const item of DATA.animals) {
        const exists = await animalRepo.findOne({ where: { slug: item.slug } });
        if (!exists) {
            await animalRepo.save(animalRepo.create(item));
        }
    }

    // 2. Seed Brands (Independent)
    console.log('🏷️ Seeding Brands...');
    const brandMap: Record<string, Brand> = {}; // Map slug -> Brand Entity
    for (const item of DATA.brands) {
        let brand = await brandRepo.findOne({ where: { slug: item.slug } });
        if (!brand) {
            brand = await brandRepo.save(brandRepo.create(item));
        }
        brandMap[item.slug] = brand;
    }

    // 3. Seed Attributes (Independent)
    console.log('🏷️ Seeding Attributes...');
    const attributeMap: Record<string, Attribute> = {}; // Map slug -> Attribute Entity
    for (const item of DATA.attributes) {
        let attr = await attributeRepo.findOne({ where: { slug: item.slug } });
        if (!attr) {
            attr = await attributeRepo.save(attributeRepo.create(item));
        }
        attributeMap[item.slug] = attr;
    }

    // 4. Connect Brands to Animals (Many-to-Many)
    console.log('🔗 Connecting Brands to Animals...');
    for (const [animalSlug, brandSlugs] of Object.entries(DATA.animal_brands)) {
        const animal = await animalRepo.findOne({ where: { slug: animalSlug } });
        if (!animal) continue;

        // فرض بر این است که Entity Animal دارای پراپرتی brands است
        if (!animal.brands) animal.brands = [];

        for (const bSlug of brandSlugs) {
            const brand = brandMap[bSlug];
            if (brand && !animal.brands.some(b => b.id === brand.id)) {
                animal.brands.push(brand);
            }
        }
        await animalRepo.save(animal);
    }

    // 5. Connect Attributes to Animals (Many-to-Many)
    console.log('🔗 Connecting Attributes to Animals...');
    for (const [animalSlug, attrGroups] of Object.entries(DATA.animal_attributes)) {
        const animal = await animalRepo.findOne({ where: { slug: animalSlug }, relations: ['attributes'] });
        if (!animal) continue;

        if (!animal.attributes) animal.attributes = [];

        for (const attrSlugs of Object.values(attrGroups)) {
            for (const aSlug of attrSlugs) {
                const attr = attributeMap[aSlug];
                if (attr && !animal.attributes.some(a => a.id === attr.id)) {
                    animal.attributes.push(attr);
                }
            }
        }
        await animalRepo.save(animal);
    }

    console.log('✅ Reference data seeded successfully');
}