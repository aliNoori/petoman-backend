import {BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException} from '@nestjs/common';
import {User} from "./entities/user.entity";
import {DataSource, Raw, Repository} from "typeorm";
import {UpdateUserDto} from "./dto/update-user.dto";
import {CreateUserDto} from "./dto/create-user.dto";
import {InjectRepository} from '@nestjs/typeorm';
import {Supporter} from "../../modules/supporter/public-supporters/supporter.entity";
import * as bcrypt from "bcrypt";
import {UserSetting} from "./entities/user-setting.entity";
import {UpdateUserSettingDto} from "./dto/update-user-setting.dto";
import {ChangePasswordDto} from "./dto/password.dto";
import * as admin from 'firebase-admin';
import {Tenant, TenantType} from "../../core/entities/tenant.entity";

@Injectable()
export class UserService {
    private readonly logger = new Logger(UserService.name);
    constructor(
        private dataSource: DataSource,
        @InjectRepository(UserSetting)
        private readonly settingsRepo: Repository<UserSetting>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Supporter)
        private readonly supporterRepo: Repository<Supporter>,
        @InjectRepository(Tenant) private tenantRepository: Repository<Tenant>,
    ) {}
    async create(createUserDto: CreateUserDto): Promise<User> {
        //this.logger.log(`${createUserDto.avatar}`);
        // Default password if none provided
        let hashedPassword: string;

        if (createUserDto.password) {
            // Hash provided password
            hashedPassword = await bcrypt.hash(createUserDto.password, 10);
        } else {
            // Hash default password
            hashedPassword = await bcrypt.hash('12345678', 10);
        }
        // Create new user entity
        const user = await this.userRepository.create({
            ...createUserDto,
            password: hashedPassword,
        });
        // Save user to database
        return this.userRepository.save(user);
    }
    /*findAll(): Promise<User[]> {
        return this.userRepository.find();
    }*/

    async findFiltered(currentUser: any) {
        // Define role-based access map
        const accessMap = {
            admin: null,
            danim_admin: ['danim_subscriber','danim_admin','danim_author','danim_editor'],
            supporter_admin: ['hamian_subscriber','supporter_admin','supporter_subscriber'],
            film_admin: ['film_subscriber','film_admin'],
            vet_admin: ['vet_subscriber','vet_admin'],
            market_admin: ['market_subscriber','market_admin']
        };

        const userRoles: string[] = currentUser.legacyRoles;
        // Admin can see all users
        if (userRoles.includes('admin')) {
            return this.userRepository.find({ order: { createdAt: 'DESC' } });
        }
        // Find manager role from user roles
        const managerRole = userRoles.find(r => accessMap[r]);
        if (!managerRole) throw new ForbiddenException('شما دسترسی مشاهده کاربران را ندارید');

        const allowedRoles = accessMap[managerRole];
        // Filter users based on allowed roles
        return this.userRepository.find({
            where: {
                legacyRoles: Raw(alias => `${alias} ?| array[:...legacyRoles]`, { legacyRoles: allowedRoles })
            },
            order: { createdAt: 'DESC' }
        });
    }

    async getSupportersWithDonations() {
        // Fetch supporters with related user and donations
        const supporters = await this.supporterRepo.find({
            relations: ['user', 'donations', 'donations.kindnessMeeting'],
        })
        // Map supporters with donation details
        return supporters.map(supporter => ({
            supporterId: supporter.id,
            user: {
                id: supporter.user.id,
                fullName: supporter.user.fullName,
                email: supporter.user.email,
                phoneNumber: supporter.user.phoneNumber,
            },
            totalDonations: supporter.donations.length,
            donations: supporter.donations.map(donation => ({
                id: donation.id,
                amount: donation.amount,
                method: donation.method,
                status: donation.status,
                date: donation.date,
                time: donation.time,
                note:donation.note,
                kindnessMeeting: {
                    id: donation.kindnessMeeting?.id,
                    title: donation.kindnessMeeting?.title,
                },
            })),
        }))
    }
    async findOne(id: string): Promise<User> {
        // Find user by ID with supporter profile relation
        const user = await this.userRepository.findOne({
            where: { id },
            relations: ['supporterProfile','roles'],
        });

        if (!user) throw new NotFoundException('User not found');
        return user;
    }

    async findByEmail(email: string): Promise<User> {
        // Find user by email
        const user = await this.userRepository.findOneBy({ email });
        if (!user) throw new NotFoundException('User not found');
        return user;
    }

    async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
        // Find user by phone number
        return this.userRepository.findOne({ where: { phoneNumber } } as any);
    }
    async findById(id: string): Promise<User | null> {
        // Find user by ID with supporter profile relation
        return this.userRepository.findOne({ where: { id },relations: ['supporterProfile','settings'] });
    }
    async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
        await this.userRepository.update(id, updateUserDto);
        // Update user fields
        return this.findOne(id);
    }

    async remove(id: string): Promise<void> {
        // Delete user by ID
        await this.userRepository.delete(id);
    }
    async setOnlineStatus(userId: string, online: boolean) {
        // Update online status and last seen
        await this.userRepository.update(userId, {
            isOnline: online,
            lastSeen: !online ? new Date() : null,
        });
    }
    async setTenantOnlineStatus(userId: string, online: boolean) {
        // 1. پیدا کردن tenant با await
        const tenant = await this.tenantRepository.findOne({
            where: { ownerUserId: userId,type:TenantType.VET,isSuspended:false}
        });
        // 2. اگر tenant وجود داشت، وضعیت را آپدیت کن
        if (tenant) {
            await this.tenantRepository.update(
                { id: tenant.id }, // شرط آپدیت
                {
                    isOnline: online,
                    lastActivityAt: new Date()
                }
            );
        }

    }
    async getOnlineUsers(): Promise<User[]> {
        // Get all users currently online
        return this.userRepository.find({ where: { isOnline: true } });
    }

    async toggleUserStatus(id: string) {
        // Toggle active status of user
        const user = await this.findOne(id);
        user.isActive = !user.isActive;
        return this.userRepository.save(user);
    }


    async getUserSettings(userId: string): Promise<UserSetting> {
        // Get user settings by userId
        let settings = await this.settingsRepo.findOne({
            where: { userId },
        })
        // If not exists, create default settings
        if (!settings) {
            settings = this.settingsRepo.create({ userId })
            await this.settingsRepo.save(settings)
        }

        return settings
    }

    async updateUserSettings(
        userId: string,
        dto: UpdateUserSettingDto,
    ): Promise<UserSetting> {
        // Get existing settings
        const settings = await this.getUserSettings(userId)
        // Update with new values
        Object.assign(settings, dto)

        return this.settingsRepo.save(settings)
    }

    async changePassword(userId: string, dto: ChangePasswordDto) {
        // Find user by ID
        const user = await this.userRepository.findOneBy({ id: userId })
        // Validate current password
        if (!user || !(await bcrypt.compare(dto.currentPassword, user.password))) {
            throw new BadRequestException('رمز فعلی اشتباه است')
        }
        // Hash and update new password
        user.password = await bcrypt.hash(dto.newPassword, 10)
        await this.userRepository.save(user)

        return { success: true }
    }

    async saveTokenNotification(userId: string, token: string) {
        // Find user by ID
        const user = await this.userRepository.findOneBy({ id: userId })
        // Validate current password
        if (!user) {
            throw new BadRequestException('کاربر پیدا نشد.')
        }
        // Hash and update new password
        user.fcm_token = token
        await this.userRepository.save(user)

        return { success: true }
    }

    // مثال در سرویس
    async updateNotificationSetting(userId: string, field: string, value: boolean) {
        const repo = this.dataSource.getRepository(UserSetting);

        // پیدا کردن تنظیمات کاربر
        let setting = await repo.findOne({ where: { userId } });

        // اگر وجود نداشت، بساز
        if (!setting) {
            setting = repo.create({ userId });
        }

        // آپدیت فیلد مورد نظر به صورت امن
        switch (field) {
            case 'orderNotifications':
                setting.orderNotifications = value;
                break;
            case 'discountNotifications':
                setting.discountNotifications = value;
                break;
            case 'smsNotifications':
                setting.smsNotifications = value;
                break;

            case 'appointmentTimeNotifications':
                setting.appointmentTimeNotifications = value;
                break;
            case 'vaccinationNotifications':
                setting.vaccinationNotifications = value;
                break;
            case 'smsAppointmentNotifications':
                setting.smsAppointmentNotifications = value;
                break;
            case 'newsletter':
                setting.newsletter = value;

                break;
            default:
                throw new BadRequestException('فیلد نامعتبر است');
        }

        return repo.save(setting);
    }

    async blockUser(userId: string,blockReason:string) {
        // پیدا کردن کاربر
        const user = await this.userRepository.findOne({ where: { id: userId } });

        if (!user) {
            throw new NotFoundException('کاربر یافت نشد');
        }

        // اگر قبلاً مسدود شده باشد، کاری انجام نده (یا می‌توانید خطا دهید)
        if (user.isBlocked) {
            throw new BadRequestException('این کاربر قبلاً مسدود شده است');
        }

        // تغییر وضعیت به مسدود شده
        user.isBlocked = true;
        user.blockReason=blockReason

        // ذخیره تغییرات
        const savedUser=await this.userRepository.save(user);

        // اگر کاربر آنلاین است، وضعیت آنلاین بودن او را قطع کن
        if (user.isOnline) {
            await this.setOnlineStatus(userId, false);
        }

        return { success: true, message: 'کاربر با موفقیت مسدود شد' };
    }

    async isBlocked(userId: string): Promise<boolean> {
        const user = await this.findById(userId);
        // اگر کاربر پیدا نشد یا isBlocked true باشد، یعنی مسدود است
        // فرض بر این است که isBlocked یک boolean در entity کاربر است
        return user?.isBlocked ?? false;
    }

    // متد جدید برای ارسال نوتیفیکیشن
    async sendNotificationToUser(userId: string, title: string, body: string, data: any = {}) {
        // ۱. دریافت کاربر و توکن فایربیس او
        const user = await this.userRepository.findOne({ where: { id: userId } });

        if (!user || !user.fcm_token) {
            throw new NotFoundException('کاربر پیدا نشد یا توکن فایربیس ندارد.');
        }

        // ۲. آماده‌سازی پیکربندی نوتیفیکیشن
        const message = {
            token: user.fcm_token, // توکن ذخیره شده در دیتابیس
            notification: {
                title: title,
                body: body,
                // icon: '/pet.png', // اگر می‌خواهید آیکون خاصی داشته باشد (در سوئیتر تعریف شده باشد)
            },
            data: data, // داده‌های اضافی مثل ID نوبت یا لینک
        };

        try {
            // ۳. ارسال پیام
            const response = await admin.messaging().send(message);
            console.log('Successfully sent message:', response);
            return { success: true, messageId: response };
        } catch (error) {
            console.error('Error sending message:', error);
            // اگر توکن منقضی شده باشد، بهتر است آن را از دیتابیس پاک کنید
            if (error.code === 'messaging/invalid-registration-token' ||
                error.code === 'messaging/registration-token-not-registered') {
                user.fcm_token = undefined; // پاک کردن توکن نامعتبر
                await this.userRepository.save(user);
            }
            throw new BadRequestException('خطا در ارسال نوتیفیکیشن');
        }
    }

}
