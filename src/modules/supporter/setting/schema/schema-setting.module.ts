import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchemaSetting } from './schema-setting.entity';
import { SchemaSettingService } from './schema-setting.service';
import { SchemaSettingController } from './schema-setting.controller';

@Module({
    imports: [TypeOrmModule.forFeature([SchemaSetting])],
    controllers: [SchemaSettingController],
    providers: [SchemaSettingService],
    exports: [SchemaSettingService],
})
export class SchemaSettingModule {}
