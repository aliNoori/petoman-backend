import { Module } from '@nestjs/common';

import {TypeOrmModule} from "@nestjs/typeorm";
import {Session} from './entities/session.entity'
import {SessionController} from "./session.controller";
import {SessionService} from "./session.service";
import {DeviceDetectorService} from "./device-detector.service";
import {BlacklistService} from "./blacklist.service";
import {TokenBlacklist} from "./entities/token-blacklist.entity";
import {JwtModule} from "@nestjs/jwt";



@Module({
  imports: [TypeOrmModule.forFeature([Session,TokenBlacklist]),JwtModule],
  controllers: [SessionController],
  providers: [SessionService,DeviceDetectorService,BlacklistService],
  exports: [SessionService,DeviceDetectorService,BlacklistService],
})
export class SessionModule {}
