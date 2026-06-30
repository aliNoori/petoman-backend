import {Controller, Post, Body, Get, Param, Patch, Delete, UseGuards} from '@nestjs/common';
import { DonationService } from './donation.service';
import {CreateDonationDto} from "./dto/create-donation.dto";
import {CurrentUser} from "../../../shared/auth/guards/current-user.decorator";
import {User} from "../../../shared/user/entities/user.entity";
import {JwtAuthGuard} from "../../../shared/auth/guards/jwt-auth.guard";
import {ACL} from "../../../shared/auth/guards/acl.decorator";
import {ResourceGuard} from "../../../shared/auth/guards/resource.guard";
import {ApiTags} from "@nestjs/swagger";


@ApiTags('donations')
@UseGuards(JwtAuthGuard,ResourceGuard)
@ACL('create','supporters')
@Controller({path: 'donations', version: '1'})
export class DonationController {
    constructor(private readonly donationService: DonationService) {}

    @Post()
    create(@Body() body,@CurrentUser() user: User) {
        return this.donationService.create(body,user);
    }
    @Patch(':id')
    update(@Param('id') id: string, @Body() body: Partial<CreateDonationDto>) {
        return this.donationService.update(id, body)
    }

    @Get()
    findAll() {
        return this.donationService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.donationService.findOne(id);
    }
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.donationService.remove(id)
    }
}