import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeneralSetting } from './general-setting.entity';
import { GeneralSettingService } from './general-setting.service';
import { GeneralSettingController } from './general-setting.controller';

@Module({
    imports: [TypeOrmModule.forFeature([GeneralSetting])],
    controllers: [GeneralSettingController],
    providers: [GeneralSettingService],
    exports: [GeneralSettingService],
})
export class GeneralSettingModule {}