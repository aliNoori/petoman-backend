import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    ParseUUIDPipe, Req, UseGuards, Logger, ForbiddenException,
} from '@nestjs/common';
import { SupporterService } from './supporter.service';
import { CreateSupporterDto } from './dto/create-supporter.dto';
import { UpdateSupporterDto } from './dto/update-supporter.dto';
import {InjectRolesBuilder, RolesBuilder} from "nest-access-control";
import {CurrentUser} from "../../../shared/auth/guards/current-user.decorator";
import {User} from "../../../shared/user/entities/user.entity";
import {JwtAuthGuard} from "../../../shared/auth/guards/jwt-auth.guard";
import {ACL} from "../../../shared/auth/guards/acl.decorator";
import {ResourceGuard} from "../../../shared/auth/guards/resource.guard";
import {ApiTags} from "@nestjs/swagger";


@ApiTags('Supporters')
@Controller({ path: 'supporters', version: '1' })

export class SupporterController {

    constructor(
        //@InjectRolesBuilder()
        //private readonly rolesBuilder: RolesBuilder,
        private readonly supporterService: SupporterService) {}

    @Post()
    @UseGuards(JwtAuthGuard,ResourceGuard)
    @ACL('create', 'supporters')
    create(@Body() dto: CreateSupporterDto,@CurrentUser() user: User) {
        //const permission = this.rolesBuilder.can(user.roles).createAny('supporters');
        /*if (!permission.granted) {
            throw new ForbiddenException('You do not have permission to create users');
        }*/

        return this.supporterService.create(dto,user);
    }
    @Get()
    findAll() {
        return this.supporterService.findAll();
    }

    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.supporterService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard,ResourceGuard)
    @ACL('create', 'supporters')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateSupporterDto,
    ) {
        return this.supporterService.update(id, dto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard,ResourceGuard)
    @ACL('create', 'supporters')
    remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.supporterService.remove(id);
    }
}
