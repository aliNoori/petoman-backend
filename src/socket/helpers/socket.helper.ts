import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { MessageService} from "../message/message.service";
import { ConsultationsService} from "../consultation/consultations.service";
import { ClinicCapacityService} from "../../modules/vet&clinic/clinic-capacity.service";
import { UserService} from "../../shared/user/user.service";

@Injectable()
export class SocketHelper {
    private logger = new Logger('SocketHelper');
}