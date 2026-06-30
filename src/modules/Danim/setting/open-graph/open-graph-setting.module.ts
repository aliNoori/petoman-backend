import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DanimOpenGraphSetting } from './open-graph-setting.entity';
import { DanimOpenGraphSettingService } from './open-graph-setting.service';
import { DanimOpenGraphSettingController } from './open-graph-setting.controller';

@Module({
    imports: [TypeOrmModule.forFeature([DanimOpenGraphSetting])],
    controllers: [DanimOpenGraphSettingController],
    providers: [DanimOpenGraphSettingService],
    exports: [DanimOpenGraphSettingService],
})
export class DanimOpenGraphSettingModule {}
