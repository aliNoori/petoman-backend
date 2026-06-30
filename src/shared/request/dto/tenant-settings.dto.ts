import {
    IsString,
    IsOptional,
    IsEmail,
    IsBoolean,
    Length,
    Matches,
    IsUrl,
    IsNotEmpty,
    MinLength,
    ValidateNested,
    IsObject
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// --- کلاس‌های کمکی ---

class VisitTypeDto {
    @ApiProperty({ example: true })
    @IsBoolean()
    @IsOptional()
    enabled?: boolean;

    @ApiProperty({ example: '150,000' })
    @IsString()
    @IsOptional()
    price?: string;
}

// کلاس جدید برای نگهداری مجموعه ویزیت‌ها
class VisitPricingDto {
    @ApiProperty({ type: VisitTypeDto })
    @ValidateNested()
    @Type(() => VisitTypeDto)
    inPerson?: VisitTypeDto;

    @ApiProperty({ type: VisitTypeDto })
    @ValidateNested()
    @Type(() => VisitTypeDto)
    home?: VisitTypeDto;

    @ApiProperty({ type: VisitTypeDto })
    @ValidateNested()
    @Type(() => VisitTypeDto)
    chat?: VisitTypeDto;

    @ApiProperty({ type: VisitTypeDto })
    @ValidateNested()
    @Type(() => VisitTypeDto)
    phoneInstant?: VisitTypeDto;
}

class PhoneScheduleOptionDto {
    @ApiProperty({ example: true })
    @IsBoolean()
    @IsOptional()
    enabled?: boolean;

    @ApiProperty({ example: '100,000' })
    @IsString()
    @IsOptional()
    price?: string;
}

class PhoneScheduleOptionsDto {
    @ApiProperty({ type: PhoneScheduleOptionDto })
    @ValidateNested()
    @Type(() => PhoneScheduleOptionDto)
    min15?: PhoneScheduleOptionDto;

    @ApiProperty({ type: PhoneScheduleOptionDto })
    @ValidateNested()
    @Type(() => PhoneScheduleOptionDto)
    min30?: PhoneScheduleOptionDto;

    @ApiProperty({ type: PhoneScheduleOptionDto })
    @ValidateNested()
    @Type(() => PhoneScheduleOptionDto)
    hour1?: PhoneScheduleOptionDto;

    @ApiProperty({ type: PhoneScheduleOptionDto })
    @ValidateNested()
    @Type(() => PhoneScheduleOptionDto)
    custom?: PhoneScheduleOptionDto;
}

class PhoneScheduleSettingsDto {
    @ApiProperty({ example: true })
    @IsBoolean()
    @IsOptional()
    enabled?: boolean;

    @ApiProperty({ type: PhoneScheduleOptionsDto })
    @ValidateNested()
    @Type(() => PhoneScheduleOptionsDto)
    options?: PhoneScheduleOptionsDto;
}

// --- DTO اصلی ---

export class UpdateVetClinicInfoDto {
    @ApiPropertyOptional({ type: 'string', format: 'binary' })
    @IsOptional()
    @IsString()
    logo?: string;

    @ApiPropertyOptional({ example: 'کلینیک دکتر علی' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ example: 'توضیحات مربوط به کلینیک...' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ example: '12345/98' })
    @IsOptional()
    @IsString()
    licenseNumber?: string;

    @ApiPropertyOptional({ example: '0012345678' })
    @IsOptional()
    @IsString()
    medicalSystemCode?: string;

    @ApiPropertyOptional({ example: '0827978207', minLength: 10, maxLength: 10 })
    @IsOptional()
    @IsString()
    @Length(10, 10)
    ownerNationalId?: string;

    @ApiPropertyOptional({ example: 'علی نوری' })
    @IsOptional()
    @IsString()
    ownerName?: string;

    @ApiPropertyOptional({ example: '021-12345678' })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiPropertyOptional({ example: '09123456789' })
    @IsOptional()
    @IsString()
    @Matches(/^09\d{9}$/, { message: 'فرمت شماره موبایل صحیح نیست' })
    mobile?: string;

    @ApiPropertyOptional({ example: 'info@clinic.com' })
    @IsOptional()
    @IsEmail({}, { message: 'فرمت ایمیل صحیح نیست' })
    email?: string;

    @ApiPropertyOptional({ example: 'https://www.clinic.com' })
    @IsOptional()
    @IsUrl({}, { message: 'فرمت وبسایت صحیح نیست' })
    website?: string;

    @ApiPropertyOptional({ example: 'اصفهان' })
    @IsOptional()
    @IsString()
    province?: string;

    @ApiPropertyOptional({ example: 'کاشان' })
    @IsOptional()
    @IsString()
    city?: string;

    @ApiPropertyOptional({ example: '1234567890', minLength: 10, maxLength: 10 })
    @IsOptional()
    @IsString()
    @Length(10, 10)
    postalCode?: string;

    @ApiPropertyOptional({ example: 'خیابان توحید، پلاک ۹' })
    @IsOptional()
    address?: any;

    @ApiPropertyOptional({ example: 'متخصص جراحی حیوانات' })
    @IsOptional()
    @IsString()
    specialty?: string;

    @ApiPropertyOptional({ example: false })
    @IsOptional()
    @IsBoolean() // در فرانت‌اند به صورت عدد ارسال می‌شود اما معمولاً در بدنه درخواست به صورت رشته (string) یا عدد (number) قابل قبول است. اگر مطمئن هستید عدد می‌آید می‌توانید از @IsNumber() استفاده کنید.
    is24Hours?:boolean;

    @ApiPropertyOptional({ example: 12 })
    @IsOptional()
    @IsString() // در فرانت‌اند به صورت عدد ارسال می‌شود اما معمولاً در بدنه درخواست به صورت رشته (string) یا عدد (number) قابل قبول است. اگر مطمئن هستید عدد می‌آید می‌توانید از @IsNumber() استفاده کنید.
    experience?: string | number;

    @ApiPropertyOptional({ example: 12 })
    @IsOptional()
    @IsString() // در فرانت‌اند به صورت عدد ارسال می‌شود اما معمولاً در بدنه درخواست به صورت رشته (string) یا عدد (number) قابل قبول است. اگر مطمئن هستید عدد می‌آید می‌توانید از @IsNumber() استفاده کنید.
    closeTime?: string | number;


    @ApiPropertyOptional({ example: 12 })
    @IsOptional()
    @IsString() // در فرانت‌اند به صورت عدد ارسال می‌شود اما معمولاً در بدنه درخواست به صورت رشته (string) یا عدد (number) قابل قبول است. اگر مطمئن هستید عدد می‌آید می‌توانید از @IsNumber() استفاده کنید.
    openTime?: string | number;

    @ApiPropertyOptional({
        type: [String],
        example: ['جمعه', 'شنبه']
    })
    @IsOptional()
    @IsString({ each: true }) // بررسی می‌کند که هر آیتم داخل آرایه از نوع رشته باشد
    closedDays?: string[];

    @ApiPropertyOptional({
        type: [String],
        example: ['دکترای دامپزشکی - دانشگاه تهران', 'فوق تخصص جراحی - دانشگاه وین']
    })
    @IsOptional()
    @IsString({ each: true }) // بررسی می‌کند که هر آیتم داخل آرایه از نوع رشته باشد
    education?: string[];

    @ApiPropertyOptional({
        type: [String],
        example: ['جراحی ارتوپدی', 'جراحی بافت نرم']
    })
    @IsOptional()
    @IsString({ each: true })
    specialties?: string[];
}

export class UpdatePricingDto {
    // استفاده از کلاس جدید VisitPricingDto به جای تعریف آبجکت inline
    @ApiProperty({ type: VisitPricingDto })
    @ValidateNested()
    @Type(() => VisitPricingDto)
    visitPricing?: VisitPricingDto;

    @ApiProperty({ type: PhoneScheduleSettingsDto })
    @ValidateNested()
    @Type(() => PhoneScheduleSettingsDto)
    phoneScheduleSettings?: PhoneScheduleSettingsDto;
}

export class ChangePasswordDto {
    @ApiProperty({ example: 'OldPassword123' })
    @IsString()
    @IsNotEmpty()
    currentPassword: string;

    @ApiProperty({ example: 'NewStrongPass456', minLength: 8 })
    @IsString()
    @IsNotEmpty()
    @MinLength(8, { message: 'رمز عبور باید حداقل ۸ کاراکتر باشد' })
    newPassword: string;
}