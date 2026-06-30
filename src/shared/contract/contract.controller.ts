import {Controller, Post, Body, Get, Param, Put, UseGuards, Req} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ContractService} from "./contract.service";
import { CreateContractDto, UpdateContractStatusDto} from "./create-contract.dto";
import { JwtAuthGuard} from "../auth/guards/jwt-auth.guard";
import { CurrentUser} from "../auth/guards/current-user.decorator";
import { User} from "../user/entities/user.entity";
import {Request} from "express";

@ApiTags('Tenant Contracts')
@Controller('contracts')
@UseGuards(JwtAuthGuard)
export class ContractController {
    constructor(private readonly contractService: ContractService) {}

    @Post()
    @ApiOperation({ summary: 'Create a new contract for a tenant request' })
    @ApiResponse({ status: 201, description: 'Contract created successfully.' })
    async createContract(
        @Body() createContractDto: CreateContractDto,
        @CurrentUser() user: User,
    ) {
        return this.contractService.createContract(createContractDto, user);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get contract details' })
    @ApiResponse({ status: 200, description: 'Return contract details.' })
    async getContract(@Param('id') id: string) {
        return this.contractService.findOne(id);
    }

    @Put(':id/status')
    @ApiOperation({ summary: 'Update contract status (e.g., sign or reject)' })
    @ApiResponse({ status: 200, description: 'Contract status updated.' })
    async updateContractStatus(
        @Param('id') id: string,
        @Body() updateDto: UpdateContractStatusDto,
        @CurrentUser() user: User,
    ) {
        return this.contractService.updateContractStatus(id, updateDto, user);
    }

    @Get('user/audit-log')
    @ApiOperation({ summary: 'Get contract details with audit log for form completion' })
    @ApiResponse({ status: 200, description: 'Return contract details with audit log.' })
    async getContractAuditLog(
        @CurrentUser() user: User,
        @Req() req: Request
    ) {
        const deviceInfo = this.extractDeviceInfo(req);

        return this.contractService.getContractAuditLog(user,deviceInfo);
    }

    private extractDeviceInfo(req: Request): { ip: string; userAgent: string } {
        // نکته مهم: برای دریافت IP واقعی، باید در main.ts app.enableTrustProxy() را صدا زده باشید
        // اگر پشت NGINX/Cloudflare هستید، req.ip یا req.ips کار می‌کند.
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';

        return {ip, userAgent};
    }
}