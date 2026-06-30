import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm'; // <--- In را اضافه کنید
import { Role} from "../../core/entities/role.entity";
import { Permission} from "../../core/entities/permission.entity";
import { RolePermission} from "../../core/entities/role-permission.entity";
import { CreateRoleDto } from './dto/create-role.dto'; // <--- ایمپورت جدید
import { UpdateRoleDto } from './dto/update-role.dto'; // <--- ایمپورت جدید

@Injectable()
export class RolesService {
    // لیست نام‌های رزرو شده
    private readonly RESERVED_ROLE_NAMES = ['OWNER', 'ADMIN', 'STAFF', 'SUPER_ADMIN'];
    constructor(
        @InjectRepository(Role)
        private rolesRepository: Repository<Role>,
        @InjectRepository(Permission)
        private permissionsRepository: Repository<Permission>,
        @InjectRepository(RolePermission)
        private rolePermissionsRepository: Repository<RolePermission>,
    ) {}

    async findAll(): Promise<Role[]> {
        const roles = await this.rolesRepository.find({
            relations: ['rolePermissions', 'rolePermissions.permission'],
        });

        // تبدیل دسترسی‌ها به آرایه رشته برای فرانت‌اند
        return roles.map(role => ({
            ...role,
            permissions: role.rolePermissions.map(rp => rp.permission.name)
        }));
    }

    async findOne(id: string): Promise<Role> {
        const role = await this.rolesRepository.findOne({
            where: { id },
            relations: ['rolePermissions', 'rolePermissions.permission'],
        });
        if (!role) {
            throw new NotFoundException('نقش یافت نشد');
        }
        return {
            ...role,
            permissions: role.rolePermissions.map(rp => rp.permission.name)
        } as Role;
    }

    // تغییر تابع create برای پذیرش ساختار جدید
    async create(createRoleDto: CreateRoleDto): Promise<Role> {
        const { name, description, icon, color, permissions } = createRoleDto;

        // ۱. چک کردن نام‌های رزرو شده
        if (this.RESERVED_ROLE_NAMES.includes(name)) {
            throw new BadRequestException('نام نقش وارد شده رزرو شده است و نمی‌توانید نقشی با این نام بسازید.');
        }

        // بررسی وجود نقش
        let role = await this.rolesRepository.findOne({ where: { name } });

        if (role) {
            // اگر نقش وجود داشت و سیستمی نبود، آن را آپدیت کن
            if (role.isSystem) {
                throw new BadRequestException('امکان ویرایش نقش‌های سیستمی وجود ندارد');
            }

            if (description !== undefined) role.description = description;
            if (icon) role.icon = icon;
            if (color) role.color = color;
            await this.rolesRepository.save(role);
        } else {
            // اگر وجود نداشت، بساز
            role = this.rolesRepository.create({
                name,
                description,
                icon: icon || 'ti ti-shield',
                color: color || '#8b5cf6',
                isSystem: false,
                usersCount: 0,
            });
            role = await this.rolesRepository.save(role);
        }

        // به‌روزرسانی دسترسی‌ها
        if (permissions && permissions.length > 0) {
            await this.updateRolePermissions(role.id, permissions);
        }

        return this.findOne(role.id);
    }

    async update(id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
        const role = await this.rolesRepository.findOne({ where: { id } });

        if (!role) throw new NotFoundException('نقش یافت نشد');

        if (role.isSystem) {
            throw new BadRequestException('امکان ویرایش نقش‌های سیستمی وجود ندارد');
        }

        const { name, description, icon, color, permissions } = updateRoleDto;

        // اگر نام تغییر کرده است
        if (name) {
            // ۱. چک کردن نام‌های رزرو شده
            if (this.RESERVED_ROLE_NAMES.includes(name)) {
                throw new BadRequestException('نام نقش وارد شده رزرو شده است.');
            }

            // ۲. چک کردن تکراری نبودن نام جدید (فقط اگر نام تغییر کرده باشد)
            if (name !== role.name) {
                const existingRole = await this.rolesRepository.findOne({ where: { name } });
                if (existingRole) {
                    throw new BadRequestException('نقشی با این نام وجود دارد');
                }
                role.name = name;
            }
        }

        if (description !== undefined) role.description = description;
        if (icon) role.icon = icon;
        if (color) role.color = color;

        await this.rolesRepository.save(role);

        if (permissions !== undefined) {
            await this.updateRolePermissions(id, permissions);
        }

        return this.findOne(id);
    }

    async remove(id: string): Promise<void> {
        const role = await this.rolesRepository.findOne({ where: { id } });

        if (!role) throw new NotFoundException('نقش یافت نشد');

        if (role.isSystem) {
            throw new BadRequestException('امکان حذف نقش‌های سیستمی وجود ندارد');
        }

        await this.rolesRepository.delete(id);
    }

    // تغییر تابع updateRolePermissions برای استفاده از لیبل
    private async updateRolePermissions(roleId: string, permissionsData: { key: string, label: string }[]) {
        await this.rolePermissionsRepository.delete({ roleId });

        // استخراج کلیدها برای جستجو
        const keys = permissionsData.map(p => p.key);

        const existingPerms = await this.permissionsRepository.findBy({
            name: In(keys),
        });

        const existingNames = existingPerms.map(p => p.name);

        // پیدا کردن دسترسی‌هایی که وجود ندارند
        const missingItems = permissionsData.filter(p => !existingNames.includes(p.key));

        // ایجاد دسترسی‌های گمشده با استفاده از لیبل ارسالی از فرانت
        const newPerms = missingItems.map(item =>
            this.permissionsRepository.create({
                name: item.key,
                label: item.label, // استفاده از لیبل ارسالی
                description: `Generated permission for ${item.key}`
            })
        );

        if (newPerms.length > 0) {
            await this.permissionsRepository.save(newPerms);
        }

        const allPerms = [...existingPerms, ...newPerms];

        const rolePermissions = allPerms.map(permission =>
            this.rolePermissionsRepository.create({
                roleId,
                permissionId: permission.id,
            })
        );

        await this.rolePermissionsRepository.save(rolePermissions);
    }
}