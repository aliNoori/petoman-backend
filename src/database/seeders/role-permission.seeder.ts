import { DataSource } from 'typeorm';
import { Role } from '../../core/entities/role.entity';
import { Permission } from '../../core/entities/permission.entity';
import { RolePermission } from '../../core/entities/role-permission.entity';

export async function seedRolePermissions(dataSource: DataSource) {
    const roleRepo = dataSource.getRepository(Role);
    const permRepo = dataSource.getRepository(Permission);
    const rolePermRepo = dataSource.getRepository(RolePermission);

    // ۱. دریافت نقش‌ها
    const superAdmin = await roleRepo.findOne({ where: { name: 'SUPER_ADMIN' } });
    const owner = await roleRepo.findOne({ where: { name: 'OWNER' } });
    const admin = await roleRepo.findOne({ where: { name: 'ADMIN' } });
    const staff = await roleRepo.findOne({ where: { name: 'STAFF' } });

    if (!owner || !admin || !staff || !superAdmin) {
        console.error('❌ Roles not found. Please seed roles first.');
        return;
    }

    // ۲. دریافت تمام پرمیژن‌ها
    const allPermissions = await permRepo.find();

    // ۳. تابع کمکی برای تخصیص پرمیژن (با جلوگیری از تکرار)
    const assignPermissions = async (role: Role, permissions: Permission[]) => {
        const rolePermissionsToSave: RolePermission[] = [];

        for (const perm of permissions) {
            // چک می‌کنیم آیا این رابطه قبلاً وجود دارد یا خیر
            const exists = await rolePermRepo.exists({
                where: {
                    roleId: role.id,
                    permissionId: perm.id,
                },
            });

            if (!exists) {
                rolePermissionsToSave.push(
                    rolePermRepo.create({
                        roleId: role.id,
                        permissionId: perm.id,
                    })
                );
            }
        }

        // ذخیره دسته‌جمعی برای سرعت بیشتر
        if (rolePermissionsToSave.length > 0) {
            await rolePermRepo.save(rolePermissionsToSave);
            console.log(`✅ Assigned ${rolePermissionsToSave.length} permissions to role: ${role.name}`);
        } else {
            console.log(`ℹ️  Role ${role.name} is already up to date.`);
        }
    };

    // ==========================================
    // ۴. تخصیص پرمیژن‌ها به نقش‌ها
    // ==========================================

    // SUPER_ADMIN: دسترسی به همه چیز (تمام پرمیژن‌ها)
    if (superAdmin) {
        await assignPermissions(superAdmin, allPermissions);
    }

    // OWNER (مالک تنت):
    // دسترسی به تمام امکانات تنت (محصولات، دارو، سفارش، مالی، تنظیمات، کاربران تنت و...)
    // دسترسی به مدیریت "کل پلتفرم" (سایر تنت‌ها) ندارد.
    // بنابراین پرمیژن‌های مرتبط با مدیریت چندگانه تنت‌ها (اگر داشته باشد) یا '*' (اگر '*' مخدوش است) را فیلتر می‌کنیم.
    // در معماری استاندارد، Owner تمام پرمیژن‌های داخلی تنت را دارد.
    if (owner) {
        // فرض بر این است که پرمیژن‌های عمومی (مثل dashboard.view, products.manage و...) برای Owner مجاز هستند.
        // پرمیژن‌هایی که فقط برای Super Admin و مدیریت چندین تنت هستند (مثل tenant.manage در سطح کل) حذف می‌شوند.
        const ownerPerms = allPermissions.filter((p) => {
            // اگر پرمیژنی با tenant. شروع می‌شود، معمولاً مربوط به مدیریت ساختار چند-تنتی است.
            // اما اگر Owner بخواهد تنت خود را مدیریت کند، پرمیژن‌های داخلی (مثل users.manage, settings.manage) را دارد.
            // بنابراین فقط پرمیژن‌های "مدیریت جهانی" را حذف می‌کنیم.
            // در لیست شما، پرمیژن‌های عمومی هستند.
            // بیایید فرض کنیم Owner همه چیز را در تنت خود دارد، مگر اینکه پرمیژنی صراحتاً "Global" باشد.
            // در لیست شما، '*' وجود دارد. اگر '*' به معنای "همه تنت‌ها" است، Owner آن را ندارد.
            // اگر '*' به معنای "دسترسی نامحدود در تنت خود" است، Owner آن را دارد.
            // با توجه به تعریف شما: "Super admin مدیریت کل پلتفرم"، پس '*' متعلق به Super Admin است.
            if (p.name === '*') return false;

            // پرمیژن‌های مربوط به مدیریت چندین تنت (اگر در لیست باشند)
            if (p.name === 'tenant.manage') return false; // مدیریت سایر تنت‌ها یا ساختار اصلی پلتفرم

            // بقیه پرمیژن‌ها (محصولات، دارو، مالی، تنظیمات تنت و...) مجاز هستند
            return true;
        });
        await assignPermissions(owner, ownerPerms);
    }

    // ADMIN (مدیر تنت):
    // دسترسی‌های مشابه Owner، اما ممکن است برخی دسترسی‌های حساس مالی یا سیستمی را نداشته باشد.
    // معمولاً Admin تمام دسترسی‌های عملیاتی تنت را دارد.
    if (admin) {
        const adminPerms = allPermissions.filter((p) => {
            if (p.name === '*') return false;
            if (p.name === 'tenant.manage') return false;

            // Admin معمولاً به تنظیمات بسیار حساس سیستم (مثل درگاه پرداخت کل) دسترسی ندارد
            // اما به تنظیمات تنت (مثل نام تنت، لوگو و...) دسترسی دارد.
            // بیایید Admin را کمی محدودتر از Owner در نظر بگیریم:
            // Admin به 'settings.payment' (تنظیمات درگاه کل) دسترسی ندارد؟ یا فقط تنظیمات داخلی تنت؟
            // معمولاً Payment تنظیمات کلانت است.
            if (p.name === 'settings.payment') return false;
            if (p.name === 'settings.manage') return false; // اگر این به معنای دسترسی به تنظیمات کل سیستم است

            // بقیه دسترسی‌های عملیاتی مجاز است
            return true;
        });
        await assignPermissions(admin, adminPerms);
    }

    // STAFF (دستیار تنت):
    // دسترسی محدود به عملیات روزمره
    if (staff) {
        const allowedStaffPermissions = [
            'dashboard.view', // دیدن داشبورد اختصاصی
            'products.list',
            'products.view',
            'orders.list',
            'orders.view',
            'orders.manage', // مثلا تغییر وضعیت به "تحویل داده شد"
            'appointments.list',
            'appointments.view',
            'appointments.manage', // تایید یا کنسل نوبت
            'medicines.list',
            'medicines.view',
            'prescriptions.list',
            'prescriptions.view',
            'prescriptions.dispense', // تحویل دارو
            'reviews.list',
            'reviews.manage', // تایید نظر
            // 'chat.send', // اگر چت داخلی دارند
            // 'chat.read',
        ];

        const staffPerms = allPermissions.filter((p) =>
            allowedStaffPermissions.includes(p.name)
        );
        await assignPermissions(staff, staffPerms);
    }

    console.log('🎉 RolePermission data seeded successfully');
}