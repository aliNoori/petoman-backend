import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { MessageModule } from './message/message.module';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from '../shared/user/user.module';
import {ClinicModule} from "../modules/vet&clinic/clinic.module";
import {ConsultationsModule} from "./consultation/consultations.module";

@Module({
    imports: [
        MessageModule,ConsultationsModule,
        JwtModule.register({
            secret: process.env.JWT_SECRET || 'my-secret-key',
            signOptions: { expiresIn: '1d' },
        }),
        UserModule,ClinicModule
    ],
    providers: [ChatGateway],
    exports: [ChatGateway],
})
export class SocketModule {}
