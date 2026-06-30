import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DanimHomePageSetting} from "./home-page.enitity";
import { DanimHomePageSettingService} from "./home-page.service";
import { DanimHomePageSettingController} from "./home-page.controller";

@Module({
    imports: [TypeOrmModule.forFeature([DanimHomePageSetting])],
    controllers: [DanimHomePageSettingController],
    providers: [DanimHomePageSettingService],
    exports: [DanimHomePageSettingService],
})
export class DanimGeneralSettingModule {}