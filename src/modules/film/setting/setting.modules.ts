import {Module} from "@nestjs/common";
import {TypeOrmModule} from "@nestjs/typeorm";
import {FilmGeneralSetting} from "./general/entities/general-setting.entity";
import {FilmSettingController} from "./general/setting.controller";
import {FilmSettingService} from "./general/setting.service";
import {FilmAdvanceSetting} from "./general/entities/advance-setting.entity";
import {FilmSeoSetting} from "./general/entities/seo-setting.entity";
import {FilmApiSetting} from "./general/entities/api-setting.entity";
import {FilmSocialSetting} from "./general/entities/social-setting.entity";
import {FilmOpengraphSetting} from "./general/entities/opengraph-setting.entity";

@Module({
    imports: [TypeOrmModule.forFeature([

        FilmGeneralSetting,
        FilmAdvanceSetting,
        FilmSeoSetting,
        FilmApiSetting,
        FilmSocialSetting,
        FilmOpengraphSetting
        ])],
    controllers: [
        FilmSettingController,
    ],
    providers: [
        FilmSettingService,
        ],
})
export class FilmSettingModule {
}
