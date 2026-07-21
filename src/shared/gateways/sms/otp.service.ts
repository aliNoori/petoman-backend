import {Injectable, Logger} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {MoreThan, Repository} from 'typeorm';
import * as bcrypt from 'bcrypt';
import {OtpCode} from './entities/otp-code.entity';
import {User, UserRole} from "../../user/entities/user.entity";
import {SmsService} from './sms.service';
import {JwtService} from "@nestjs/jwt";
import {SessionService} from "../../user/session.service";
import {instanceToPlain} from "class-transformer";
import {DeviceDetectorService, ParsedDeviceInfo} from "../../user/device-detector.service";

@Injectable()
export class OtpService {
    private readonly logger = new Logger(OtpService.name);

    constructor(
        private readonly sessionService: SessionService,
        private readonly jwtService: JwtService,
        private readonly smsService: SmsService,
        @InjectRepository(OtpCode) private readonly otpRepo: Repository<OtpCode>,
        @InjectRepository(User) private readonly userRepo: Repository<User>,
        private readonly deviceDetector: DeviceDetectorService,
    ) {}

    private getDeviceDetails(userAgent: string): ParsedDeviceInfo {
        return this.deviceDetector.parse(userAgent);
    }

    async generateAndSend(phone: string, ipAddress?: string): Promise<{ success: boolean; message: string }> {
        await this.invalidateOldCodes(phone);

        const code = this.generateCode();

        const otp = this.otpRepo.create({
            phone,
            code: await bcrypt.hash(code, 10),
            expiresAt: new Date(Date.now() + 2 * 60 * 1000), // 2 دقیقه
            ipAddress,
            isUsed: false,
        });
        await this.otpRepo.save(otp);

        if (process.env.NODE_ENV !== 'production') {
            this.logger.log(`🔑 OTP Code for ${phone}: ${code}`);
        }
        const patternCode = process.env.IPPANEL_PATTERN_CODE ?? '';
        const result = await this.smsService.sendPattern(phone, patternCode, {"verification-code": code});

        if (!result && process.env.NODE_ENV !== 'production') {
            return {success: true, message: `کد تایید: ${code} (محیط توسعه - SMS ارسال نشد)`};
        }

        return {
            success: result,
            message: result ? 'کد تایید با موفقیت ارسال شد' : 'خطا در ارسال کد تایید. لطفا دوباره تلاش کنید',
        };
    }

    async verify(code: string, identifier: string, method: 'phone' | 'email' = 'phone', deviceInfo?: any,isVerifiedPhone?:boolean) {
        const field = method === 'email' ? 'email' : 'phone';

        const otpRecord = await this.otpRepo.findOne({
            where: {
                [field]: identifier,
                isUsed: false,
                expiresAt: MoreThan(new Date())
            },
            order: {createdAt: 'DESC'},
        });

        if (!otpRecord) {
            return {success: false, message: 'کد تایید نامعتبر یا منقضی شده است'};
        }

        const isValid = await bcrypt.compare(code, otpRecord.code);
        if (!isValid) {
            return {success: false, message: 'کد تایید اشتباه است'};
        }

        otpRecord.isUsed = true;
        await this.otpRepo.save(otpRecord);

        if(isVerifiedPhone){
            return {
                success: true,
                message: 'شماره موبایل با موفقیت تایید شد',
            };
        }

        let user = await this.userRepo.findOne({where: {phoneNumber: identifier}, relations: ['roles']} as any);

        if (!user) {
            // user = this.userRepo.create({
            //     phoneNumber: identifier,
            //     roles: [UserRole.SUBSCRIBER],
            //     phoneVerifiedAt: new Date(),
            // });
            // await this.userRepo.save(user);
            return {
                success: true,
                message: 'ورود با موفقیت انجام شد',
                user: null,
                token: null,
                isNewUser: true,
            };
        } else if (!user.phoneVerifiedAt) {
            user.phoneVerifiedAt = new Date();
            await this.userRepo.save(user);
        }

        // تولید توکن
        const token = this.jwtService.sign({userId: user.id});

        // --- ثبت نشست (Session) ---

        if (deviceInfo) {
            const deviceDetails = this.getDeviceDetails(deviceInfo.userAgent);

            await this.sessionService.createSession(
                user.id,
                token,
                {
                    ip: deviceInfo.ip,
                    userAgent: deviceInfo.userAgent,
                    os: deviceDetails.os,
                    browser: deviceDetails.browser,
                    device: deviceDetails.device,
                    engine: deviceDetails.engine
                });
        }

        return {
            success: true,
            message: 'ورود با موفقیت انجام شد',
            user: instanceToPlain(user),
            token: token,
            isNewUser: !user.firstName,
        };
    }

    private generateCode(): string {
        return Math.floor(1000 + Math.random() * 9000).toString();
    }

    private async invalidateOldCodes(phone: string) {
        await this.otpRepo.update({phone, isUsed: false}, {isUsed: true});
    }

    async canRequestNew(phone: string): Promise<boolean> {
        const lastOtp = await this.otpRepo.findOne({where: {phone}, order: {createdAt: 'DESC'}});
        if (!lastOtp) return true;
        const diff = (Date.now() - lastOtp.createdAt.getTime()) / 1000;
        return diff >= 120;
    }
}