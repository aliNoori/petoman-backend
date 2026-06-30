import {Module} from "@nestjs/common";
import {TypeOrmModule} from "@nestjs/typeorm";

import {RequestSupporterController} from "./request-supporter.controller";
import {RequestSupporterService} from "./request-supporter.service";
import {RequestSupporter} from "./request-supporter.entity";

@Module({
    imports: [TypeOrmModule.forFeature([RequestSupporter])],
    controllers: [RequestSupporterController],
    providers: [RequestSupporterService],
    exports: [TypeOrmModule],
})
export class RequestSupporterModule {}
