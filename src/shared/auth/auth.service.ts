import {Inject, Injectable, Logger, NotFoundException, UnauthorizedException} from '@nestjs/common';
import {RegisterDto} from "./dto/register.dto";
import {LoginDto} from "./dto/login.dto";
import {UserService} from "../user/user.service";
import {JwtService} from "@nestjs/jwt";
import * as bcrypt from 'bcrypt';
import {plainToInstance} from "class-transformer";
import {LoginResponseDto} from "./dto/login.response.dto";
import {RegisterResponseDto} from "./dto/register.response.dto";
import {User, UserRole} from "../user/entities/user.entity";
import {VerifyOtpDto} from "./dto/verify-otp.dto";
import {RefreshTokenDto} from "./dto/refresh-token.dto";
import {UpdateUserDto} from "../user/dto/update-user.dto";
import {CACHE_MANAGER} from '@nestjs/cache-manager';
import {Cache} from 'cache-manager';
import {OtpService} from "../gateways/sms/otp.service";
import {TenantUser} from "../../core/entities/tenant-user.entity";
import {Repository} from "typeorm";
import {InjectRepository} from "@nestjs/typeorm";
import {SessionService} from "../user/session.service";
import {DeviceDetectorService, ParsedDeviceInfo} from "../user/device-detector.service";

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        private readonly otpService:OtpService,
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
        @InjectRepository(TenantUser) private tenantUserRepo: Repository<TenantUser>,
        @InjectRepository(User) private userRepo: Repository<User>,
        private readonly sessionService: SessionService,
        private readonly deviceDetector: DeviceDetectorService,
    ) {}

    private getDeviceDetails(userAgent: string): ParsedDeviceInfo {
        return this.deviceDetector.parse(userAgent);
    }

    async register(dto: RegisterDto, deviceInfo: { ip: string; userAgent: string }) {
        const user = await this.userService.create({...dto,legacyRoles:[UserRole.SUBSCRIBER]});

        // --- ثبت آخرین ورود (Last Login) ---
        user.lastLogin = new Date(); // تنظیم زمان فعلی
        await this.userRepo.save(user); // ذخیره تغییرات در دیتابیس
        // تولید توکن
        const token = this.jwtService.sign({userId: user.id});
        // استخراج جزئیات دقیق دستگاه
        const deviceDetails = this.getDeviceDetails(deviceInfo.userAgent);
        // ۳. ایجاد نشست (Session) در هنگام ثبت‌نام
        // توجه: برای دریافت اطلاعات دستگاه (deviceInfo) باید این اطلاعات را از ورودی دریافت کنید یا از درخواست (Request) استخراج کنید.
        // در اینجا یک مقدار پیش‌فرض قرار داده‌ایم.
        await this.sessionService.createSession(
            user.id,
            token,
            {
                ip: deviceInfo.ip,
                userAgent: deviceInfo.userAgent, // کل User-Agent هم ذخیره می‌شود برای لاگ‌های دقیق‌تر
                os: deviceDetails.os,
                browser: deviceDetails.browser,
                device: deviceDetails.device,
                engine: deviceDetails.engine
            }
        );

        return plainToInstance(RegisterResponseDto, {
            accessToken: token,
            token: token,
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                avatar: user.avatar,
                phoneNumber: user.phoneNumber,
                isVerified: user.isVerified,
            },
        });

    }

    async login(dto: LoginDto, deviceInfo: { ip: string; userAgent: string }) {

        const user = await this.userService.findByEmail(dto.email);

        if (!user) throw new UnauthorizedException('Invalid credentials');

        const isMatch = await bcrypt.compare(dto.password, user.password);
        if (!isMatch) throw new UnauthorizedException('Invalid credentials');

        let payload: any;

        // User with tenant
        if (dto.tenantId) {
            const tenantUser = await this.tenantUserRepo.findOne({
                where: { userId: user.id, tenantId: dto.tenantId, status: 'active' },
                relations: ['role', 'role.permissions'],
            });

            if (!tenantUser) throw new UnauthorizedException('User not in tenant');

            payload = {
                sub: user.id,
                tenantId: dto.tenantId,
                roleId: tenantUser.roleId,
                permissions: tenantUser.role.rolePermissions.map((p) => p.roleId),
            };
        } else {
            // User manual
            payload = {
                sub: user.id,
                type: 'basic-user',
            };
        }

        // --- ثبت آخرین ورود (Last Login) ---
        user.lastLogin = new Date(); // تنظیم زمان فعلی
        await this.userRepo.save(user); // ذخیره تغییرات در دیتابیس

        // تولید توکن دسترسی
        const accessToken = this.jwtService.sign(payload);

        const deviceDetails = this.getDeviceDetails(deviceInfo.userAgent);

        await this.sessionService.createSession(
            user.id,
            accessToken,
            {
                ip: deviceInfo.ip,
                userAgent: deviceInfo.userAgent,
                os: deviceDetails.os,
                browser: deviceDetails.browser,
                device: deviceDetails.device,
                engine: deviceDetails.engine
            });

        return plainToInstance(LoginResponseDto, {
            accessToken: accessToken,
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                avatar: user.avatar,
                roles: user.roles,
                phoneNumber: user.phoneNumber,
                isVerified: user.isVerified,
            },
        });
    }


    // بررسی شماره تلفن
    async checkPhoneNumber(phoneNumber: string): Promise<{ exists: boolean }> {
        const user = await this.userService.findByPhoneNumber(phoneNumber);
        return {exists: !!user};
    }

    // ارسال OTP (اینجا فقط شبیه‌سازی شده)
    async sendOtp(phoneNumber: string): Promise<{success:boolean, message: string/*, code: string*/ }> {
        const user = await this.userService.findByPhoneNumber(phoneNumber);
        //if (!user) throw new NotFoundException('کاربر یافت نشد');
        // اینجا باید سرویس ارسال پیامک OTP اضافه بشه
        // const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
        // await (this.cacheManager as any).set(`otp:${phoneNumber}`, otpCode, {ttl: 300});
        // return {message: 'کد تایید ارسال شد', code: otpCode};
        return await this.otpService.generateAndSend(phoneNumber);

    }

    // تایید OTP
    async verifyOtp(dto: VerifyOtpDto, deviceInfo: { ip: string; userAgent: string }) {
        // اینجا باید بررسی کد OTP انجام بشه
        // const user = await this.userService.findByPhoneNumber(dto.phoneNumber);
        // if (!user) {
        //     const cachedCode = await this.cacheManager.get<string>(`otp:${dto.phoneNumber}`);
        //     if (!cachedCode) throw new Error('کد منقضی شده یا یافت نشد');
        //     if (cachedCode !== dto.code) throw new Error('کد وارد شده صحیح نیست');
        //
        //     return {
        //         token: null,
        //         user:null,
        //     };
        //
        // }
        //
        // const cachedCode = await this.cacheManager.get<string>(`otp:${dto.phoneNumber}`);
        // if (!cachedCode) throw new Error('کد منقضی شده یا یافت نشد');
        // if (cachedCode !== dto.code) throw new Error('کد وارد شده صحیح نیست');
        //TODO:add decorator device info

        return await this.otpService.verify(dto.code,dto.phoneNumber,'phone',deviceInfo,dto.isVerifiedPhone);
    }

    // رفرش توکن
    async refreshToken(dto: RefreshTokenDto) {
        try {
            const payload = this.jwtService.verify(dto.refreshToken);
            const user = await this.userService.findById(payload.userId);
            if (!user) throw new UnauthorizedException();

            return {
                token: this.jwtService.sign({userId: user.id}),
                user,
            };
        } catch {
            throw new UnauthorizedException('Refresh token invalid');
        }
    }

    // خروج
    /*async logout(userId: string) {
        // اگر توکن‌ها رو در دیتابیس نگه می‌داری، اینجا باید invalidate بشن
        this.logger.log(`User ${userId} logged out`);
        return {message: 'خروج موفقیت‌آمیز بود'};
    }*/
    async logout(currentToken: string) {
        try {
            // ۱. دیکد کردن توکن برای استخراج شناسه کاربر (بدون بررسی اعتبار برای سرعت بیشتر، یا با verify برای امنیت بیشتر)
            const payload = this.jwtService.decode(currentToken) as any;

            if (!payload || !payload.userId) {
                throw new UnauthorizedException('توکن نامعتبر است');
            }

            const userId = payload.userId;

            // ۲. حذف نشست فعلی از دیتابیس
            // متد revokeSession در SessionService نیاز به sessionId و userId دارد.
            // اما چون ما فقط توکن را داریم، بهتر است یک متد در SessionService بسازیم که بر اساس توکن حذف کند.
            // فعلاً فرض می‌کنیم متدی داریم که بر اساس توکن و یوزر آی دی حذف می‌کند.

            await this.sessionService.revokeSessionByToken(userId, currentToken);

            this.logger.log(`User ${userId} logged out successfully.`);

            return { message: 'خروج موفقیت‌آمیز بود' };
        } catch (error) {
            this.logger.error('Error during logout', error);
            // حتی اگر سرور خطا داد، کلاینت اطلاعات خود را پاک کرده است.
            throw error;
        }
    }

    // دریافت اطلاعات کاربر فعلی
    async getCurrentUser(userId: string): Promise<User> {
        const user = await this.userService.findById(userId);
        if (!user) throw new NotFoundException('کاربر یافت نشد');
        return user;
    }

    // بروزرسانی پروفایل
    async updateProfile(userId: string, dto: UpdateUserDto): Promise<User> {
        return await this.userService.update(userId, dto);
    }
}
