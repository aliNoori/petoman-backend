import {
    BadRequestException,
    Body,
    Controller,
    ForbiddenException,
    Get,
    Headers,
    HttpCode,
    HttpStatus,
    Logger,
    Patch,
    Post,
    Req,
    UnauthorizedException,
    UploadedFile,
    UseGuards,
    UseInterceptors
} from '@nestjs/common';
import {AuthService} from "./auth.service";
import {Request} from 'express';
import {FileInterceptor} from "@nestjs/platform-express";
import {RegisterDto} from "./dto/register.dto";
import {LoginDto} from "./dto/login.dto";
import {uploadOptions} from "../../utils/file-upload.utils";
import {JwtAuthGuard} from "./guards/jwt-auth.guard";
import {CurrentUser} from "./guards/current-user.decorator";
import {User} from "../user/entities/user.entity";
import {VerifyOtpDto} from "./dto/verify-otp.dto";
import {RefreshTokenDto} from "./dto/refresh-token.dto";
import {UpdateUserDto} from "../user/dto/update-user.dto";
import {CheckUserDto} from "./dto/check-user.dto";
import {TenantUser} from "../../core/entities/tenant-user.entity";
import {Repository} from "typeorm";
import {InjectRepository} from "@nestjs/typeorm";
import {I18nService} from "nestjs-i18n";
import {BlacklistGuard} from "./guards/blacklist.guard";

/*@Controller('auth')*/
@Controller({path: 'auth', version: '1'})
export class AuthController {
    private readonly logger = new Logger(AuthController.name);

    constructor(
        private readonly i18n: I18nService,
        private readonly authService: AuthService,
        @InjectRepository(TenantUser) private tenantUserRepo: Repository<TenantUser>,
        @InjectRepository(User) private userRepo: Repository<User>,
    ) {
    }

    // متد کمکی برای استخراج اطلاعات دستگاه از Request
    private extractDeviceInfo(req: Request): { ip: string; userAgent: string } {
        // نکته مهم: برای دریافت IP واقعی، باید در main.ts app.enableTrustProxy() را صدا زده باشید
        // اگر پشت NGINX/Cloudflare هستید، req.ip یا req.ips کار می‌کند.
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';

        return {ip, userAgent};
    }

    @Post('register')
    @UseInterceptors(FileInterceptor('avatar', uploadOptions('users')) as any)
    async register(@Body() dto: RegisterDto,
                   @Req() req: Request,
                   @UploadedFile() file?: Express.Multer.File,
    ) {

        /*if (!file) {
            throw new BadRequestException('فایل تصویر ارسال نشده است');
        }*/

        const imageUrl = file ? `/uploads/users/${file.filename}` : 'null';
        const deviceInfo = this.extractDeviceInfo(req);
        return await this.authService.register({...dto, avatar: imageUrl}, deviceInfo);
    }

    @Post('login')
    async login(@Body() dto: LoginDto, @Req() req: Request) {
        const deviceInfo = this.extractDeviceInfo(req);
        return await this.authService.login(dto, deviceInfo);
    }

    // بررسی شماره تلفن
    @Post('check-phone')
    async checkPhone(@Body('phoneNumber') phoneNumber: string) {
        if (!phoneNumber) throw new BadRequestException('شماره تلفن الزامی است');
        return await this.authService.checkPhoneNumber(phoneNumber);
    }

    // ارسال OTP
    @Post('send-otp')
    async sendOtp(@Body('phoneNumber') phoneNumber: string) {
        if (!phoneNumber) throw new BadRequestException('شماره تلفن الزامی است');
        return await this.authService.sendOtp(phoneNumber)

    }

    // تایید OTP
    @Post('verify-otp')
    async verifyOtp(@Body() dto: VerifyOtpDto, @Req() req: Request) {
        const deviceInfo = this.extractDeviceInfo(req);
        return await this.authService.verifyOtp(dto, deviceInfo);
    }

    @Post('check-user')
    async checkUser(@Body() dto: CheckUserDto, @Req() req: Request) {
        const {shopId, ...otpData} = dto;
        const deviceInfo = this.extractDeviceInfo(req);
        // 1. Verify OTP first
        const result = await this.verifyOtp(otpData as VerifyOtpDto, req);

        // If OTP verification failed, throw error immediately
        if (!result.success) {
            throw new UnauthorizedException('Invalid or expired OTP code.');
        }

        // If it's a new user, return result (registration flow)
        if (result.isNewUser) {
            return result;
        }

        // Ensure user exists in the result
        if (!result.user || !result.token) {
            throw new BadRequestException('Login failed: User data missing.');
        }

        const userId = result.user.id;

        // 2. Explicit shop selection (multi-tenant user picked a shop already)
        if (shopId) {
            const tenantUser = await this.tenantUserRepo.findOne({
                where: {shopId, userId},
                relations: ['tenant'] // Load tenant relation to access 'type'
            });
            if (tenantUser) {
                return {
                    ...result,
                    tenantId: tenantUser.tenantId,
                    adminPanelType: tenantUser.tenant.type
                };
            }

            // ShopId provided but no valid link found
            throw new UnauthorizedException(await this.i18n.t('error.forbidden'));
        }

        // 3. Auto-detect: find every shop this phone number manages
        const tenantUsers = await this.tenantUserRepo.find({
            where: {userId, status: 'active'},
            relations: ['tenant']
        });

        if (tenantUsers.length === 1) {
            const [tenantUser] = tenantUsers;
            return {
                ...result,
                tenantId: tenantUser.tenantId,
                adminPanelType: tenantUser.tenant.type
            };
        }

        if (tenantUsers.length > 1) {
            // Same phone manages multiple shops - let the client ask which one
            return {
                ...result,
                needsShopSelection: true,
                shops: tenantUsers.map((tu) => ({
                    shopId: tu.shopId,
                    tenantId: tu.tenantId,
                    name: tu.tenant.name,
                    type: tu.tenant.type
                }))
            };
        }

        // 4. No tenant link found - check Main Admin (Super Admin)
        const userWithRole = await this.userRepo.findOne({
            where: {id: userId},
            relations: ['roles'] // لود کردن لیست نقش‌ها
        });

        // تغییر: بررسی اینکه آیا کاربر نقش SUPER_ADMIN دارد یا خیر
        if (userWithRole?.roles?.some((role) => role.name === 'SUPER_ADMIN')) {
            return {
                ...result,
                adminPanelType: 'ADMIN'
            };
        }

        // If neither a valid Tenant nor a Main Admin
        throw new ForbiddenException(await this.i18n.t('error.forbidden'));
    }

    // انتخاب فروشگاه توسط کاربری که به چند فروشگاه لینک است (بعد از ورود موفق)
    @Post('select-tenant')
    @UseGuards(JwtAuthGuard, BlacklistGuard)
    async selectTenant(@CurrentUser() user: User, @Body('shopId') shopId: string) {
        if (!shopId) throw new BadRequestException('شناسه فروشگاه الزامی است');

        const tenantUser = await this.tenantUserRepo.findOne({
            where: {shopId, userId: user.id, status: 'active'},
            relations: ['tenant']
        });

        if (!tenantUser) {
            throw new ForbiddenException(await this.i18n.t('error.forbidden'));
        }

        return {
            tenantId: tenantUser.tenantId,
            adminPanelType: tenantUser.tenant.type
        };
    }

    // رفرش توکن
    @Post('refresh')
    async refresh(@Body() dto: RefreshTokenDto) {
        return await this.authService.refreshToken(dto);
    }

    // خروج
    /*@Post('logout')
    @UseGuards(JwtAuthGuard,BlacklistGuard)
    logout(@CurrentUser() user: User) {
        return this.authService.logout(user.id);
    }*/

    @Post('logout')
    @HttpCode(HttpStatus.OK) // خروج معمولاً ۲۰۰ برمی‌گرداند نه ۲۰۱
    async logout(@Headers('authorization') authHeader: string) {
        console.log('authHeader', authHeader)
        // استخراج توکن از هدر (فرمت: "Bearer <token>")
        if (!authHeader) {
            // اگر توکن نبود، کاری انجام ندهید یا خطا دهید
            return {message: 'No token provided'};
        }

        const token = authHeader.replace('Bearer ', '');
        console.log('token', token)

        return this.authService.logout(token);
    }

    // دریافت اطلاعات کاربر فعلی
    @Get('me')
    @UseGuards(JwtAuthGuard, BlacklistGuard)
    async me(@CurrentUser() user: User) {
        return await this.authService.getCurrentUser(user.id);
    }

    // بروزرسانی پروفایل
    @Patch('profile')
    @UseGuards(JwtAuthGuard, BlacklistGuard)
    @UseInterceptors(FileInterceptor('avatar', uploadOptions('users')) as any)
    async updateProfile(
        @CurrentUser() user: User,
        @Body() dto: UpdateUserDto,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        const imageUrl = file ? `/uploads/users/${file.filename}` : undefined;
        return await this.authService.updateProfile(user.id, {...dto, avatar: imageUrl});
    }

}
