import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import {TenantCategory} from "../../category/tenant-category.entity";
import {UserTenantCategoryController} from "./user-tenant-category.controller";
import {UserTenantCategoryService} from "./user-tenant-category.service";


@Module({
    imports: [TypeOrmModule.forFeature([TenantCategory])],
    controllers: [UserTenantCategoryController],
    providers: [UserTenantCategoryService],
    exports: [UserTenantCategoryService],
})
export class UserTenantCategoryModule {}
