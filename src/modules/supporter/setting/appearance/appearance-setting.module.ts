import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppearanceSetting } from './appearance-setting.entity';
import { AppearanceSettingService } from './appearance-setting.service';
import { AppearanceSettingController } from './appearance-setting.controller';

@Module({
    imports: [TypeOrmModule.forFeature([AppearanceSetting])],
    controllers: [AppearanceSettingController],
    providers: [AppearanceSettingService],
    exports: [AppearanceSettingService],
})
export class AppearanceSettingModule {}
