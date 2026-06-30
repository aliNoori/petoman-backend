import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DanimSeoSetting } from './seo-setting.entity';
import { DanimSeoSettingService } from './seo-setting.service';
import { DanimSeoSettingController } from './seo-setting.controller';

@Module({
    imports: [TypeOrmModule.forFeature([DanimSeoSetting])],
    controllers: [DanimSeoSettingController],
    providers: [DanimSeoSettingService],
    exports: [DanimSeoSettingService],
})
export class DanimSeoSettingModule {}
