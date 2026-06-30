// src/database/seeds/category.seed.ts
import {DataSource} from 'typeorm';
import {TenantCategory} from "../../modules/market/category/tenant-category.entity";

const CATEGORIES = [
    {
        id: 'petshop',
        name: 'پت شاپ',
        icon: 'ti ti-building-store',
        bgColor: 'bg-indigo-100',
        iconColor: 'text-indigo-600',
        children: [
            {
                id: 'food',
                name: 'غذا',
                icon: 'ti ti-bowl-food',
                bgColor: 'bg-orange-100',
                iconColor: 'text-orange-600',
                children: [
                    {
                        id: 'dog-food',
                        name: 'غذای سگ',
                        icon: 'ti ti-bone',
                        bgColor: 'bg-amber-100',
                        iconColor: 'text-amber-600',
                        children: [
                            { id: 'dog-dry', name: 'غذای خشک سگ', icon: 'ti ti-circle-dashed', bgColor: 'bg-amber-50', iconColor: 'text-amber-700' },
                            { id: 'dog-wet', name: 'غذای مرطوب سگ', icon: 'ti ti-droplet', bgColor: 'bg-amber-50', iconColor: 'text-amber-700' },
                            { id: 'dog-canned', name: 'کنسرو سگ', icon: 'ti ti-can', bgColor: 'bg-amber-50', iconColor: 'text-amber-700' },
                            { id: 'dog-treat', name: 'تشویقی سگ', icon: 'ti ti-cookie', bgColor: 'bg-amber-50', iconColor: 'text-amber-700' },
                            { id: 'dog-supplement', name: 'مکمل سگ', icon: 'ti ti-pill', bgColor: 'bg-amber-50', iconColor: 'text-amber-700' },
                        ],
                    },
                    {
                        id: 'cat-food',
                        name: 'غذای گربه',
                        icon: 'ti ti-paw',
                        bgColor: 'bg-purple-100',
                        iconColor: 'text-purple-600',
                        children: [
                            { id: 'cat-dry', name: 'غذای خشک گربه', icon: 'ti ti-circle-dashed', bgColor: 'bg-purple-50', iconColor: 'text-purple-700' },
                            { id: 'cat-wet', name: 'غذای مرطوب گربه', icon: 'ti ti-droplet', bgColor: 'bg-purple-50', iconColor: 'text-purple-700' },
                            { id: 'cat-canned', name: 'کنسرو گربه', icon: 'ti ti-can', bgColor: 'bg-purple-50', iconColor: 'text-purple-700' },
                            { id: 'cat-pate', name: 'پته گربه', icon: 'ti ti-rectangle', bgColor: 'bg-purple-50', iconColor: 'text-purple-700' },
                            { id: 'cat-treat', name: 'تشویقی گربه', icon: 'ti ti-cookie', bgColor: 'bg-purple-50', iconColor: 'text-purple-700' },
                            { id: 'cat-supplement', name: 'مکمل گربه', icon: 'ti ti-pill', bgColor: 'bg-purple-50', iconColor: 'text-purple-700' },
                        ],
                    },
                    {
                        id: 'bird-food',
                        name: 'غذای پرنده',
                        icon: 'ti ti-bird',
                        bgColor: 'bg-sky-100',
                        iconColor: 'text-sky-600',
                        children: [
                            { id: 'bird-seed', name: 'دانه پرنده', icon: 'ti ti-seed', bgColor: 'bg-sky-50', iconColor: 'text-sky-700' },
                            { id: 'bird-pellet', name: 'پلت پرنده', icon: 'ti ti-circle', bgColor: 'bg-sky-50', iconColor: 'text-sky-700' },
                            { id: 'bird-treat', name: 'تشویقی پرنده', icon: 'ti ti-cookie', bgColor: 'bg-sky-50', iconColor: 'text-sky-700' },
                        ],
                    },
                    {
                        id: 'fish-food',
                        name: 'غذای ماهی',
                        icon: 'ti ti-fish',
                        bgColor: 'bg-blue-100',
                        iconColor: 'text-blue-600',
                        children: [
                            { id: 'fish-flake', name: 'ورقه‌ای', icon: 'ti ti-layers', bgColor: 'bg-blue-50', iconColor: 'text-blue-700' },
                            { id: 'fish-pellet', name: 'پلت ماهی', icon: 'ti ti-circle', bgColor: 'bg-blue-50', iconColor: 'text-blue-700' },
                            { id: 'fish-frozen', name: 'فریز شده', icon: 'ti ti-snowflake', bgColor: 'bg-blue-50', iconColor: 'text-blue-700' },
                        ],
                    },
                ],
            },
            {
                id: 'hygiene',
                name: 'بهداشت',
                icon: 'ti ti-sparkles',
                bgColor: 'bg-teal-100',
                iconColor: 'text-teal-600',
                children: [
                    {
                        id: 'dog-hygiene',
                        name: 'بهداشت سگ',
                        icon: 'ti ti-bone',
                        bgColor: 'bg-amber-100',
                        iconColor: 'text-amber-600',
                        children: [
                            { id: 'dog-shampoo', name: 'شامپو سگ', icon: 'ti ti-droplet-half', bgColor: 'bg-amber-50', iconColor: 'text-amber-700' },
                            { id: 'dog-wipes', name: 'دستمال مرطوب سگ', icon: 'ti ti-sheet', bgColor: 'bg-amber-50', iconColor: 'text-amber-700' },
                            { id: 'dog-toothpaste', name: 'خمیر دندان سگ', icon: 'ti ti-tooth', bgColor: 'bg-amber-50', iconColor: 'text-amber-700' },
                            { id: 'dog-perfume', name: 'عطر و ادکلن سگ', icon: 'ti ti-spray', bgColor: 'bg-amber-50', iconColor: 'text-amber-700' },
                        ],
                    },
                    {
                        id: 'cat-hygiene',
                        name: 'بهداشت گربه',
                        icon: 'ti ti-paw',
                        bgColor: 'bg-purple-100',
                        iconColor: 'text-purple-600',
                        children: [
                            { id: 'cat-shampoo', name: 'شامپو گربه', icon: 'ti ti-droplet-half', bgColor: 'bg-purple-50', iconColor: 'text-purple-700' },
                            { id: 'cat-wipes', name: 'دستمال مرطوب گربه', icon: 'ti ti-sheet', bgColor: 'bg-purple-50', iconColor: 'text-purple-700' },
                            { id: 'cat-litter', name: 'خاک گربه', icon: 'ti ti-sand', bgColor: 'bg-purple-50', iconColor: 'text-purple-700' },
                            { id: 'cat-spray', name: 'اسپری بو بر گربه', icon: 'ti ti-spray', bgColor: 'bg-purple-50', iconColor: 'text-purple-700' },
                        ],
                    },
                ],
            },
            {
                id: 'toys',
                name: 'اسباب‌بازی',
                icon: 'ti ti-rocket',
                bgColor: 'bg-rose-100',
                iconColor: 'text-rose-600',
                children: [
                    {
                        id: 'dog-toys',
                        name: 'اسباب‌بازی سگ',
                        icon: 'ti ti-bone',
                        bgColor: 'bg-amber-100',
                        iconColor: 'text-amber-600',
                        children: [
                            { id: 'dog-ball', name: 'توپ سگ', icon: 'ti ti-ball-football', bgColor: 'bg-amber-50', iconColor: 'text-amber-700' },
                            { id: 'dog-rope', name: 'طناب سگ', icon: 'ti ti-link', bgColor: 'bg-amber-50', iconColor: 'text-amber-700' },
                            { id: 'dog-plush', name: 'عروسک سگ', icon: 'ti ti-heart', bgColor: 'bg-amber-50', iconColor: 'text-amber-700' },
                            { id: 'dog-frisbee', name: 'فریزبی سگ', icon: 'ti ti-circle-dotted', bgColor: 'bg-amber-50', iconColor: 'text-amber-700' },
                        ],
                    },
                    {
                        id: 'cat-toys',
                        name: 'اسباب ‌بازی گربه',
                        icon: 'ti ti-paw',
                        bgColor: 'bg-purple-100',
                        iconColor: 'text-purple-600',
                        children: [
                            { id: 'cat-ball', name: 'توپ گربه', icon: 'ti ti-ball-football', bgColor: 'bg-purple-50', iconColor: 'text-purple-700' },
                            { id: 'cat-mouse', name: 'موش بازی', icon: 'ti ti-mouse', bgColor: 'bg-purple-50', iconColor: 'text-purple-700' },
                            { id: 'cat-feather', name: 'پر بازی گربه', icon: 'ti ti-feather', bgColor: 'bg-purple-50', iconColor: 'text-purple-700' },
                            { id: 'cat-tunnel', name: 'تونل گربه', icon: 'ti ti-tunnel', bgColor: 'bg-purple-50', iconColor: 'text-purple-700' },
                        ],
                    },
                ],
            },
            {
                id: 'accessories',
                name: 'لوازم جانبی',
                icon: 'ti ti-tool',
                bgColor: 'bg-slate-100',
                iconColor: 'text-slate-600',
                children: [
                    {
                        id: 'dog-accessories',
                        name: 'لوازم سگ',
                        icon: 'ti ti-bone',
                        bgColor: 'bg-amber-100',
                        iconColor: 'text-amber-600',
                        children: [
                            { id: 'dog-collar', name: 'قلاده سگ', icon: 'ti ti-circle', bgColor: 'bg-amber-50', iconColor: 'text-amber-700' },
                            { id: 'dog-leash', name: 'ریسمان سگ', icon: 'ti ti-link', bgColor: 'bg-amber-50', iconColor: 'text-amber-700' },
                            { id: 'dog-harness', name: 'هارنس سگ', icon: 'ti ti-activity', bgColor: 'bg-amber-50', iconColor: 'text-amber-700' },
                            { id: 'dog-bowl', name: 'ظرف غذا سگ', icon: 'ti ti-bowl', bgColor: 'bg-amber-50', iconColor: 'text-amber-700' },
                            { id: 'dog-bed', name: 'تشک و جایگاه سگ', icon: 'ti ti-bed', bgColor: 'bg-amber-50', iconColor: 'text-amber-700' },
                        ],
                    },
                    {
                        id: 'cat-accessories',
                        name: 'لوازم گربه',
                        icon: 'ti ti-paw',
                        bgColor: 'bg-purple-100',
                        iconColor: 'text-purple-600',
                        children: [
                            { id: 'cat-collar', name: 'قلاده گربه', icon: 'ti ti-circle', bgColor: 'bg-purple-50', iconColor: 'text-purple-700' },
                            { id: 'cat-bowl', name: 'ظرف غذا گربه', icon: 'ti ti-bowl', bgColor: 'bg-purple-50', iconColor: 'text-purple-700' },
                            { id: 'cat-bed', name: 'تشک و جایگاه گربه', icon: 'ti ti-bed', bgColor: 'bg-purple-50', iconColor: 'text-purple-700' },
                            { id: 'cat-tree', name: 'درخت گربه', icon: 'ti ti-tree', bgColor: 'bg-purple-50', iconColor: 'text-purple-700' },
                            { id: 'cat-carrier', name: 'کیف حمل گربه', icon: 'ti ti-bag', bgColor: 'bg-purple-50', iconColor: 'text-purple-700' },
                        ],
                    },
                ],
            },
            {
                id: 'clothing',
                name: 'پوشاک',
                icon: 'ti ti-tshirt',
                bgColor: 'bg-pink-100',
                iconColor: 'text-pink-600',
                children: [
                    {
                        id: 'dog-clothing',
                        name: 'لباس سگ',
                        icon: 'ti ti-bone',
                        bgColor: 'bg-amber-100',
                        iconColor: 'text-amber-600',
                        children: [
                            { id: 'dog-coat', name: 'کت و ژاکت سگ', icon: 'ti ti-jacket', bgColor: 'bg-amber-50', iconColor: 'text-amber-700' },
                            { id: 'dog-raincoat', name: 'بارانی سگ', icon: 'ti ti-umbrella', bgColor: 'bg-amber-50', iconColor: 'text-amber-700' },
                            { id: 'dog-boots', name: 'کفش سگ', icon: 'ti ti-shoe', bgColor: 'bg-amber-50', iconColor: 'text-amber-700' },
                            { id: 'dog-sweater', name: 'سوئیشرت سگ', icon: 'ti ti-tshirt', bgColor: 'bg-amber-50', iconColor: 'text-amber-700' },
                        ],
                    },
                    {
                        id: 'cat-clothing',
                        name: 'لباس گربه',
                        icon: 'ti ti-paw',
                        bgColor: 'bg-purple-100',
                        iconColor: 'text-purple-600',
                        children: [
                            { id: 'cat-coat', name: 'کت و ژاکت گربه', icon: 'ti ti-jacket', bgColor: 'bg-purple-50', iconColor: 'text-purple-700' },
                            { id: 'cat-sweater', name: 'سوئیشرت گربه', icon: 'ti ti-tshirt', bgColor: 'bg-purple-50', iconColor: 'text-purple-700' },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'pharmacy',
        name: 'داروخانه',
        icon: 'ti ti-pill',
        bgColor: 'bg-emerald-100',
        iconColor: 'text-emerald-600',
        children: [
            {
                id: 'medicine',
                name: 'دارو',
                icon: 'ti ti-prescription',
                bgColor: 'bg-red-100',
                iconColor: 'text-red-600',
                children: [
                    { id: 'antibiotic', name: 'آنتی‌بیوتیک', icon: 'ti ti-chemistry', bgColor: 'bg-red-50', iconColor: 'text-red-700' },
                    { id: 'antiparasitic', name: 'ضد انگل', icon: 'ti ti-bug', bgColor: 'bg-red-50', iconColor: 'text-red-700' },
                    { id: 'painkiller', name: 'مسکن', icon: 'ti ti-first-aid-kit', bgColor: 'bg-red-50', iconColor: 'text-red-700' },
                    { id: 'digestive', name: 'گوارشی', icon: 'ti ti-bowl-food', bgColor: 'bg-red-50', iconColor: 'text-red-700' },
                ],
            },
            {
                id: 'supplement',
                name: 'مکمل',
                icon: 'ti ti-vitamin',
                bgColor: 'bg-yellow-100',
                iconColor: 'text-yellow-600',
                children: [
                    { id: 'vitamin', name: 'ویتامین', icon: 'ti ti-circle-dotted', bgColor: 'bg-yellow-50', iconColor: 'text-yellow-700' },
                    { id: 'mineral', name: 'معدنی', icon: 'ti ti-atom', bgColor: 'bg-yellow-50', iconColor: 'text-yellow-700' },
                    { id: 'probiotic', name: 'پروبیوتیک', icon: 'ti ti-bacteria', bgColor: 'bg-yellow-50', iconColor: 'text-yellow-700' },
                    { id: 'omega', name: 'امگا و چربی', icon: 'ti ti-droplet', bgColor: 'bg-yellow-50', iconColor: 'text-yellow-700' },
                ],
            },
            {
                id: 'vaccine',
                name: 'واکسن',
                icon: 'ti ti-syringe',
                bgColor: 'bg-blue-100',
                iconColor: 'text-blue-600',
                children: [
                    { id: 'core-vaccine', name: 'واکسن اصلی', icon: 'ti ti-shield-check', bgColor: 'bg-blue-50', iconColor: 'text-blue-700' },
                    { id: 'non-core-vaccine', name: 'واکسن فرعی', icon: 'ti ti-shield', bgColor: 'bg-blue-50', iconColor: 'text-blue-700' },
                ],
            },
            {
                id: 'care',
                name: 'مراقبتی',
                icon: 'ti ti-heart-handshake',
                bgColor: 'bg-pink-100',
                iconColor: 'text-pink-600',
                children: [
                    { id: 'skin-care', name: 'مراقبت پوست', icon: 'ti ti-skin', bgColor: 'bg-pink-50', iconColor: 'text-pink-700' },
                    { id: 'ear-care', name: 'مراقبت گوش', icon: 'ti ti-hearing', bgColor: 'bg-pink-50', iconColor: 'text-pink-700' },
                    { id: 'eye-care', name: 'مراقبت چشم', icon: 'ti ti-eye', bgColor: 'bg-pink-50', iconColor: 'text-pink-700' },
                    { id: 'oral-care', name: 'مراقبت دهان', icon: 'ti ti-tooth', bgColor: 'bg-pink-50', iconColor: 'text-pink-700' },
                ],
            },
            {
                id: 'equipment',
                name: 'تجهیزات',
                icon: 'ti ti-stethoscope',
                bgColor: 'bg-slate-100',
                iconColor: 'text-slate-600',
                children: [
                    { id: 'diagnostic', name: 'تشخیصی', icon: 'ti ti-activity', bgColor: 'bg-slate-50', iconColor: 'text-slate-700' },
                    { id: 'surgical', name: 'جراحی', icon: 'ti ti-scissors', bgColor: 'bg-slate-50', iconColor: 'text-slate-700' },
                ],
            },
        ],
    },
];

export async function seedCategories(dataSource: DataSource) {
    const tenantId = '4ac8eb81-41d6-42cb-b4dd-fee921da6f8b';
    const repo = dataSource.getRepository(TenantCategory);

    const saveRecursive = async (items: any[], parentId: string | null = null) => {
        for (const item of items) {
            // ۱. بررسی وجود دسته‌بندی بر اساس slug و tenantId
            let category = await repo.findOne({
                where: {
                    slug: item.id,
                    tenantId
                }
            });

            if (!category) {
                category = repo.create();
            }

            category.slug = item.id;
            category.title = item.name;
            category.icon = item.icon;
            category.iconColor = item.iconColor;
            category.bgColor = item.bgColor;
            category.tenantId = tenantId;
            category.parentId = parentId;
            category.isActive = true;

            // ۴. ذخیره (نصب یا آپدیت)
            const saved = await repo.save(category);

            // ۵. فراخوانی بازگشتی برای فرزندان
            if (item.children && item.children.length > 0) {
                await saveRecursive(item.children, saved.id);
            }
        }
    };

    await saveRecursive(CATEGORIES);
    console.log('✅ TenantCategories data seeded successfully (Upserted)');
}