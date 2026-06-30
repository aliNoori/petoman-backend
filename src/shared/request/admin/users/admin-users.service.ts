import {BadRequestException, Injectable, NotFoundException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {In, Repository} from 'typeorm';
import * as bcrypt from 'bcrypt';
import {User} from "../../../user/entities/user.entity";
import {Role} from "../../../../core/entities/role.entity";
import {CreateAdminDto} from './dto/create-admin.dto';
import {UpdateAdminDto} from './dto/update-admin.dto';
import {AssignRolesDto} from './dto/assign-roles.dto';

@Injectable()
export class AdminUsersService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        @InjectRepository(Role)
        private rolesRepository: Repository<Role>,
    ) {}

    // دریافت کاربران عادی (کاربرانی که نقش ADMIN ندارند)
    async getRegularUsers() {
        // فرض: نقش‌های سیستمی مثل ADMIN, SUPER_ADMIN مدیر محسوب می‌شوند
        const adminRoleNames = ['SUPER_ADMIN'];

        const users = await this.usersRepository.find({
            relations: ['roles', 'orders'], // <--- اضافه کردن orders به relations برای دسترسی به تعداد و آخرین سفارش
            where: (qb) => {
                const subQuery = qb.subQuery()
                    .select('userRoles.userId')
                    .from('user_roles', 'userRoles')
                    .innerJoin('userRoles.role', 'role')
                    .where('role.name IN (:...adminRoleNames)')
                    .getQuery();
                return 'user.id NOT IN ' + subQuery;
            },
            parameters: { adminRoleNames }
        } as any);

        // مپ کردن داده‌ها برای فرانت‌اند
        return users.map(user => ({
            id: user.id,
            name: user.fullName || user.lastName || user.firstName,
            avatar:user.avatar,
            email: user.email,
            phone: user.phoneNumber,
            joinDate: user.createdAt,
            ordersCount: user.orders ? user.orders.length : 0, // <--- اصلاح شده: بررسی وجود orders
            status: user.isActive ? 'active' : (user.isBlocked ? 'blocked' : 'inactive'),
            lastLogin: user.lastLogin,
            // <--- اصلاح شده: استفاده از sort برای پیدا کردن آخرین سفارش
            lastOrder: user.orders && user.orders.length > 0
                ? user.orders.reduce((latest, order) =>
                        order.createdAt > latest ? order.createdAt : latest,
                    user.orders[0].createdAt
                )
                : null,
        }));
    }
    // دریافت مدیران (کاربرانی که حداقل یک نقش دارند)
    async getAdminUsers() {
        const users = await this.usersRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.roles', 'role')
            .where((qb) => {
                const subQuery = qb.subQuery()
                    .select('userRoles.userId')
                    .from('user_roles', 'userRoles')
                    .getQuery();
                return 'user.id IN ' + subQuery;
            })
            .getMany();

        return users.map(user => ({
            id: user.id,
            name: user.fullName||user.lastName||user.firstName,
            avatar:user.avatar,
            email: user.email,
            phone: user.phoneNumber,
            joinDate: user.createdAt,
            status: user.isActive ? 'active' : (user.isBlocked ? 'blocked' : 'inactive'),
            roles: user.roles.map(r => ({
                id: r.id,
                name: r.name,
                color: r.color,
            }))
        }));
    }

    // تغییر وضعیت کاربر (فعال/مسدود)
    async toggleUserStatus(id: string) {
        const user = await this.usersRepository.findOne({ where: { id } });
        if (!user) throw new NotFoundException('کاربر یافت نشد');

        // اگر مسدود است فعالش کن و برعکس
        user.isBlocked = !user.isBlocked;
        // اگر مسدود شد، غیرفعال هم کن
        if (user.isBlocked) user.isActive = false;
        else user.isActive = true;

        await this.usersRepository.save(user);
        return { success: true };
    }

    // ایجاد مدیر
    async createAdmin(createAdminDto: CreateAdminDto) {
        const { name, email, phone, password, roleIds } = createAdminDto;

        // چک تکراری نبودن ایمیل
        const existingUser = await this.usersRepository.findOne({ where: { email } });
        if (existingUser) throw new BadRequestException('ایمیل تکراری است');

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = this.usersRepository.create({
            fullName:name,
            email,
            phoneNumber:phone,
            password: hashedPassword,
            isActive: true,
            isBlocked: false,
        });

        // اضافه کردن نقش‌ها
        if (roleIds && roleIds.length > 0) {
            user.roles = await this.rolesRepository.findBy({id: In(roleIds)});
        }

        const savedUser = await this.usersRepository.save(user);
        return this.mapAdminToResponse(savedUser);
    }

    // ویرایش مدیر
    async updateAdmin(id: string, updateAdminDto: UpdateAdminDto) {
        const user = await this.usersRepository.findOne({
            where: { id },
            relations: ['roles']
        });

        if (!user) throw new NotFoundException('مدیر یافت نشد');

        const { name, email, phone, password, roleIds } = updateAdminDto;

        if (name) user.fullName = name;
        if (email) user.email = email;
        if (phone) user.phoneNumber = phone;
        if (password) {
            user.password = await bcrypt.hash(password, 10);
        }

        // آپدیت نقش‌ها
        if (roleIds !== undefined) {
            user.roles = await this.rolesRepository.findBy({id: In(roleIds)});
        }

        await this.usersRepository.save(user);
        return this.mapAdminToResponse(user);
    }

    // حذف مدیر
    async deleteAdmin(id: string) {
        const user = await this.usersRepository.findOne({ where: { id } });
        if (!user) throw new NotFoundException('مدیر یافت نشد');

        // جلوگیری از حذف سوپر ادمین (اختیاری)
        const hasSuperAdminRole = user.roles.some(r => r.name === 'SUPER_ADMIN');
        if (hasSuperAdminRole) {
            throw new BadRequestException('امکان حذف سوپر ادمین وجود ندارد');
        }

        await this.usersRepository.delete(id);
    }

    // تخصیص نقش
    async assignRoles(id: string, assignRolesDto: AssignRolesDto) {
        const user = await this.usersRepository.findOne({ where: { id } });
        if (!user) throw new NotFoundException('کاربر یافت نشد');

        user.roles = await this.rolesRepository.findBy({id: In(assignRolesDto.roleIds)});

        await this.usersRepository.save(user);
        return this.mapAdminToResponse(user);
    }

    // هelper برای مپ کردن
    private mapAdminToResponse(user: User) {
        return {
            id: user.id,
            name: user.fullName,
            email: user.email,
            phone: user.phoneNumber,
            joinDate: user.createdAt,
            status: user.isActive ? 'active' : 'inactive',
            roles: user.roles.map(r => ({ id: r.id, name: r.name, color: r.color }))
        };
    }
}