import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DanimSchemaSetting } from './schema-setting.entity';
import { DanimSchemaSettingService } from './schema-setting.service';
import { DanimSchemaSettingController } from './schema-setting.controller';

@Module({
    imports: [TypeOrmModule.forFeature([DanimSchemaSetting])],
    controllers: [DanimSchemaSettingController],
    providers: [DanimSchemaSettingService],
    exports: [DanimSchemaSettingService],
})
export class DanimSchemaSettingModule {}
