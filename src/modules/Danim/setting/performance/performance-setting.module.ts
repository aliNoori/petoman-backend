import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DanimPerformanceSetting} from "./performance-setting.entity";
import { DanimPerformanceSettingService} from "./performance-setting.service";
import { DanimPerformanceSettingController} from "./performance-setting.controller";

@Module({
    imports: [TypeOrmModule.forFeature([DanimPerformanceSetting])],
    controllers: [DanimPerformanceSettingController],
    providers: [DanimPerformanceSettingService],
    exports: [DanimPerformanceSettingService],
})
export class DanimSeoSettingModule {}
