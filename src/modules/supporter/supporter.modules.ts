import {Module} from "@nestjs/common";
import {TypeOrmModule} from "@nestjs/typeorm";
import {Donation} from "./donation/donation.entity";
import {KindnessMeeting} from "./kindness-meeting/kindness-meeting.entity";
import {Supporter} from "./public-supporters/supporter.entity";
import {DonationController} from "./donation/donation.controller";
import {KindnessController} from "./kindness-meeting/kindness.controller";
import {SupporterController} from "./public-supporters/supporter.controller";
import {DonationService} from "./donation/donation.service";
import {KindnessService} from "./kindness-meeting/kindness.service";
import {SupporterService} from "./public-supporters/supporter.service";
import {Documentary} from "./documentation/documentary.entity";
import {Page} from "./page-builder/page.entity";
import {DocumentaryController} from "./documentation/documentary.controller";
import {PageController} from "./page-builder/page.controller";
import {DocumentaryService} from "./documentation/documentary.service";
import {PageService} from "./page-builder/page.service";
import {SettingModule} from "./setting/setting.modules";
import {User} from "../../shared/user/entities/user.entity";
import {NotificationModule} from "../../shared/notification/notification.module";
import {RequestSupporter} from "./requests/request-supporter.entity";
import {RequestSupporterController} from "./requests/request-supporter.controller";
import {RequestSupporterService} from "./requests/request-supporter.service";
import {UploadController} from "../../shared/upload/upload.controller";
import {UploadModule} from "../../shared/upload/upload.module";
import {KindnessMeetingRegistrationModule} from "./requests/kindness-meeting/kindness-meeting-registration.module";

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Documentary,
            Donation,
            KindnessMeeting,
            Page,
            Supporter,
            RequestSupporter,
            User
        ]),
        SettingModule,
        NotificationModule,
        UploadModule,
        KindnessMeetingRegistrationModule
        //FileModule, // اگر فایل یا تصویر داشته باشن
        //UserModule, // اگر به کاربر وصل باشن
    ],
    controllers: [
        DocumentaryController,
        DonationController,
        KindnessController,
        PageController,
        SupporterController,
        RequestSupporterController,
    ],
    providers: [
        DocumentaryService,
        DonationService,
        KindnessService,
        PageService,
        SupporterService,
        RequestSupporterService
    ],
})
export class SupporterModule {}
