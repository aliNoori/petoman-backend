import {Module} from "@nestjs/common";
import {TypeOrmModule} from "@nestjs/typeorm";
import {DanimGeneralSetting} from "./general/general-setting.entity";
import {DanimOpenGraphSetting} from "./open-graph/open-graph-setting.entity";
import {DanimSchemaSetting} from "./schema/schema-setting.entity";
import {DanimSeoSetting} from "./seo/seo-setting.entity";
import {DanimGeneralSettingController} from "./general/general-setting.controller";
import {DanimSchemaSettingController} from "./schema/schema-setting.controller";
import {DanimSeoSettingController} from "./seo/seo-setting.controller";
import {DanimGeneralSettingService} from "./general/general-setting.service";
import {DanimOpenGraphSettingService} from "./open-graph/open-graph-setting.service";
import {DanimSchemaSettingService} from "./schema/schema-setting.service";
import {DanimSeoSettingService} from "./seo/seo-setting.service";
import {DanimOpenGraphSettingController} from "./open-graph/open-graph-setting.controller";
import {DanimHomePageSetting} from "./home-page/home-page.enitity";
import {DanimHomePageSettingController} from "./home-page/home-page.controller";
import {DanimHomePageSettingService} from "./home-page/home-page.service";
import {DanimPerformanceSetting} from "./performance/performance-setting.entity";
import {DanimPerformanceSettingController} from "./performance/performance-setting.controller";
import {DanimPerformanceSettingService} from "./performance/performance-setting.service";

@Module({
    imports: [TypeOrmModule.forFeature([
        DanimGeneralSetting,
        DanimHomePageSetting,
        DanimPerformanceSetting,
        DanimOpenGraphSetting,
        DanimSchemaSetting,
        DanimSeoSetting,
        ])],
    controllers: [
        DanimGeneralSettingController,
        DanimHomePageSettingController,
        DanimPerformanceSettingController,
        DanimSchemaSettingController,
        DanimSeoSettingController,
        DanimOpenGraphSettingController,

    ],
    providers: [
        DanimGeneralSettingService,
        DanimHomePageSettingService,
        DanimPerformanceSettingService,
        DanimOpenGraphSettingService,
        DanimSeoSettingService,
        DanimSchemaSettingService
        ],
})
export class DanimSettingModule {
}
