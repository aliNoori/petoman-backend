import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAddressService} from "./address.service";
import { UserAddressController} from "./address.controller";
import { UserAddress} from "./address.entity";
import {JwtModule} from "@nestjs/jwt";
import {SessionModule} from "../user/session.module";

@Module({
    imports: [TypeOrmModule.forFeature([UserAddress]),JwtModule,SessionModule],
    controllers: [UserAddressController],
    providers: [UserAddressService],
    exports: [UserAddressService],
})
export class UserAddressModule {}