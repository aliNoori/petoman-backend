import {Module} from "@nestjs/common";
import {TypeOrmModule} from "@nestjs/typeorm";
import {PostModule} from "./post/post.modules";
import {Post} from "./post/post.entity"
import {DanimPageModule} from "./page/page.modules";
import {DanimSettingModule} from "./setting/setting.modules";

@Module({
    imports: [TypeOrmModule.forFeature([Post]),PostModule,DanimPageModule,DanimSettingModule],
    controllers: [],
    providers: [],
})
export class DanimModule {}
