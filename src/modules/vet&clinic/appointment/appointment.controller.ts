import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard} from "../../../shared/auth/guards/jwt-auth.guard";
import {BlacklistGuard} from "../../../shared/auth/guards/blacklist.guard";

@ApiTags('Appointment')
@Controller('appointment')
@UseGuards(JwtAuthGuard,BlacklistGuard) // محافظت از تمام مسیرها
@ApiBearerAuth()
export class AppointmentController {
    constructor() {}
}