import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OpenGraphSetting } from './open-graph-setting.entity';
import { OpenGraphSettingService } from './open-graph-setting.service';
import { OpenGraphSettingController } from './open-graph-setting.controller';

@Module({
    imports: [TypeOrmModule.forFeature([OpenGraphSetting])],
    controllers: [OpenGraphSettingController],
    providers: [OpenGraphSettingService],
    exports: [OpenGraphSettingService],
})
export class OpenGraphSettingModule {}
