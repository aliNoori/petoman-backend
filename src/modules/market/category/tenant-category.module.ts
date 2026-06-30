import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import {TenantModule} from "../../../tenants/tenant.module";
import {TenantCategory} from "./tenant-category.entity";
import {TenantCategoryController} from "./tenant-category.controller";
import {TenantCategoryService} from "./tenant-category.service";
import {JwtModule} from "@nestjs/jwt";
import {SessionModule} from "../../../shared/user/session.module";


@Module({
    imports: [TypeOrmModule.forFeature([TenantCategory]),TenantModule,JwtModule,SessionModule],
    controllers: [TenantCategoryController],
    providers: [TenantCategoryService],
    exports: [TenantCategoryService],
})
export class TenantCategoryModule {}
