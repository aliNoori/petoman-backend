import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DanimGeneralSetting } from './general-setting.entity';
import { DanimGeneralSettingService } from './general-setting.service';
import { DanimGeneralSettingController } from './general-setting.controller';

@Module({
    imports: [TypeOrmModule.forFeature([DanimGeneralSetting])],
    controllers: [DanimGeneralSettingController],
    providers: [DanimGeneralSettingService],
    exports: [DanimGeneralSettingService],
})
export class DanimGeneralSettingModule {}