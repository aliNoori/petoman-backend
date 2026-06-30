import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeoSetting } from './seo-setting.entity';
import { SeoSettingService } from './seo-setting.service';
import { SeoSettingController } from './seo-setting.controller';

@Module({
    imports: [TypeOrmModule.forFeature([SeoSetting])],
    controllers: [SeoSettingController],
    providers: [SeoSettingService],
    exports: [SeoSettingService],
})
export class SeoSettingModule {}
