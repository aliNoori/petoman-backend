import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { WithdrawalsService } from './withdrawals.service';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { UpdateWithdrawalStatusDto } from './dto/update-withdrawal-status.dto';
import {JwtAuthGuard} from "../../../shared/auth/guards/jwt-auth.guard";
import {TenantGuard} from "../../../shared/auth/guards/tenant.guard";
import {Permissions} from "../../../shared/auth/decorators/permissions.decorator";
import {Capabilities} from "../../../shared/auth/decorators/capabilities.decorator";
import {AdminGuard} from "../../../shared/auth/guards/admin-guard";

@Controller('market/wallet/withdrawals')
@UseGuards(JwtAuthGuard,TenantGuard)
@Capabilities('WALLET')
@Permissions('requests.manage')
export class WithdrawalsController {
    constructor(private readonly withdrawalsService: WithdrawalsService) {}

    @Post()
    create(@Request() req, @Body() createWithdrawalDto: CreateWithdrawalDto) {
        // userId از توکن JWT استخراج می‌شود
        return this.withdrawalsService.create(req.user.id, createWithdrawalDto);
    }

    @Get()
    findAll(@Request() req) {
        return this.withdrawalsService.findAll(req.user.id);
    }
}