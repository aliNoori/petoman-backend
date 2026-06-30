import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {AdminSettingsController} from "./admin-settings-controller";
import {AdminSetting} from "./admin-settings-entity";
import {AdminSettingsService} from "./admin-settings-service";


@Module({
    imports: [TypeOrmModule.forFeature([AdminSetting])],
    controllers: [AdminSettingsController],
    providers: [AdminSettingsService],
    exports: [AdminSettingsService],
})
export class AdminSettingModule {}