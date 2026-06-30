import {Module} from "@nestjs/common";
import {TypeOrmModule} from "@nestjs/typeorm";
import {KindnessMeeting} from "./kindness-meeting.entity";
import {KindnessController} from "./kindness.controller";
import {KindnessService} from "./kindness.service";

@Module({
    imports: [TypeOrmModule.forFeature([KindnessMeeting])],
    controllers: [KindnessController],
    providers: [KindnessService],
})
export class KindnessModule {}
