import {KindnessMeetingRegistrationService} from "./kindness-meeting-registration.service";
import {Body, Controller, Get, Param, Post} from "@nestjs/common";
import {CreateKindnessMeetingRegistrationDto} from "./create-kindness-meeting-registration.dto";

@Controller('kindness-meetings-registrations')
export class KindnessMeetingRegistrationController {
    constructor(
        private readonly service: KindnessMeetingRegistrationService,
    ) {}

    @Post(':id/registrations')
    register(
        @Param('id') id: string,
        @Body() dto: CreateKindnessMeetingRegistrationDto,
    ) {
        return this.service.register(id, dto)
    }

    @Get()
    list(/*@Param('id') id: string*/) {
        return this.service.list(/*id*/)
    }
}