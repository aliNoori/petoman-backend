import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { BankCardsService } from './bank-cards.service';
import { CreateBankCardDto } from './dto/create-bank-card.dto';
import {JwtAuthGuard} from "../../../shared/auth/guards/jwt-auth.guard";
import {TenantGuard} from "../../../shared/auth/guards/tenant.guard";
import {Permissions} from "../../../shared/auth/decorators/permissions.decorator";


@UseGuards(JwtAuthGuard,TenantGuard)
@Permissions('account.manage')

@Controller('market/shops/bank-cards')
export class BankCardsController {
    constructor(private readonly bankCardsService: BankCardsService) {}

    @Post('add-card')
    create(@Request() req, @Body() createBankCardDto: CreateBankCardDto) {

        return this.bankCardsService.create(req.user.id, createBankCardDto);
    }

    @Get()
    findAll(@Request() req) {
        return this.bankCardsService.findAll(req.user.id);
    }

    @Patch(':id/set-default')
    setDefault(@Request() req, @Param('id') id: string) {
        return this.bankCardsService.setDefault(req.user.id, id);
    }

    @Delete(':id')
    remove(@Request() req, @Param('id') id: string) {
        return this.bankCardsService.remove(req.user.id, id);
    }
}