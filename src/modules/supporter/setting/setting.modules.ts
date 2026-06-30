import {Module} from "@nestjs/common";
import {TypeOrmModule} from "@nestjs/typeorm";
import {AppearanceSetting} from "./appearance/appearance-setting.entity";
import {GeneralSetting} from "./general/general-setting.entity";
import {OpenGraphSetting} from "./open-graph/open-graph-setting.entity";
import {PaymentSetting} from "./payment/payment-setting.entity";
import {SchemaSetting} from "./schema/schema-setting.entity";
import {SeoSetting} from "./seo/seo-setting.entity";
import {AppearanceSettingController} from "./appearance/appearance-setting.controller";
import {GeneralSettingController} from "./general/general-setting.controller";
import {PaymentSettingController} from "./payment/payment-setting.controller";
import {SchemaSettingController} from "./schema/schema-setting.controller";
import {SeoSettingController} from "./seo/seo-setting.controller";
import {AppearanceSettingService} from "./appearance/appearance-setting.service";
import {GeneralSettingService} from "./general/general-setting.service";
import {OpenGraphSettingService} from "./open-graph/open-graph-setting.service";
import {PaymentSettingService} from "./payment/payment-setting.service";
import {SchemaSettingService} from "./schema/schema-setting.service";
import {SeoSettingService} from "./seo/seo-setting.service";
import {OpenGraphSettingController} from "./open-graph/open-graph-setting.controller";

@Module({
    imports: [TypeOrmModule.forFeature([
        AppearanceSetting,
        GeneralSetting,
        OpenGraphSetting,
        PaymentSetting,
        SchemaSetting,
        SeoSetting])],
    controllers: [
        AppearanceSettingController,
        GeneralSettingController,
        OpenGraphSettingController,
        PaymentSettingController,
        SchemaSettingController,
        SeoSettingController
    ],
    providers: [
        AppearanceSettingService,
        GeneralSettingService,
        OpenGraphSettingService,
        PaymentSettingService,
        SchemaSettingService,
        SeoSettingService],
})
export class SettingModule {
}
