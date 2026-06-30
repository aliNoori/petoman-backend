import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User} from "../../../user/entities/user.entity";
import { Role} from "../../../../core/entities/role.entity";
import {AdminUsersController} from "./admin-users.controller";
import {AdminUsersService} from "./admin-users.service";

@Module({
    imports: [TypeOrmModule.forFeature([User, Role])],
    controllers: [AdminUsersController],
    providers: [AdminUsersService],
    exports: [AdminUsersService],
})
export class AdminUsersModule {}