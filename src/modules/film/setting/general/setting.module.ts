import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {FilmGeneralSetting} from "./entities/general-setting.entity";
import {FilmSettingController} from "./setting.controller";
import {FilmSettingService} from "./setting.service";

@Module({
    imports: [TypeOrmModule.forFeature([FilmGeneralSetting])],
    controllers: [FilmSettingController],
    providers: [FilmSettingService],
    exports: [FilmSettingService],
})
export class SettingModule {}