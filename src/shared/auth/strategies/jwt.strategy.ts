import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import {User} from "../../user/entities/user.entity";
import {JwtPayload} from "../types/jwt-payload";
import {UserService} from "../../user/user.service";
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(
        private readonly userService:UserService) {
        super(<any>{
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: process.env.JWT_SECRET || 'my-secret-key',
        });
    }

    async validate(payload: JwtPayload): Promise<User> {
        return this.userService.findOne(payload.userId);
    }
}