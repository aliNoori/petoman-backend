import {KindnessMeetingRegistrationService} from "./kindness-meeting-registration.service";
import {KindnessMeetingRegistrationController} from "./kindness-meeting-registration.controller";
import {KindnessMeetingRegistration} from "./kindness-meeting-registration.entity";
import {KindnessMeeting} from "../../kindness-meeting/kindness-meeting.entity";
import {TypeOrmModule} from "@nestjs/typeorm";
import {Module} from "@nestjs/common";

@Module({
    imports: [
        TypeOrmModule.forFeature([
            KindnessMeeting,
            KindnessMeetingRegistration,
        ]),
    ],
    controllers: [KindnessMeetingRegistrationController],
    providers: [KindnessMeetingRegistrationService],
})
export class KindnessMeetingRegistrationModule {}