import {Module} from "@nestjs/common";
import {TypeOrmModule} from "@nestjs/typeorm";
import {Supporter} from "./supporter.entity";
import {SupporterController} from "./supporter.controller";
import {SupporterService} from "./supporter.service";

@Module({
    imports: [TypeOrmModule.forFeature([Supporter])],
    controllers: [SupporterController],
    providers: [SupporterService],
    exports: [TypeOrmModule],
})
export class SupporterModule {}
