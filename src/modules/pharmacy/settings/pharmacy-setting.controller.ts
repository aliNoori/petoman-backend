import {
    Controller,
    Get,
    Post,
    Body,
    UseGuards,
    Request,
    Put, Param
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth
} from '@nestjs/swagger';

import {JwtAuthGuard} from "../../../shared/auth/guards/jwt-auth.guard";
import {TenantMembershipGuard} from "../../../shared/auth/guards/tenant-membership.guard";
import {CapabilityGuard} from "../../../shared/auth/guards/capability.guard";
import {TenantGuard} from "../../../shared/auth/guards/tenant.guard";
import {Capabilities} from "../../../shared/auth/decorators/capabilities.decorator";
import {PharmacySettingService} from "./pharmacy-setting.service";
import {UpdateShippingDto} from "../../market/settings/dto/market-shipping.dto";
import {BulkUpdateSettingsDto, UpdateSettingDto} from "../../market/settings/dto/market-setting.dto";


@ApiTags('Pharmacy Settings')
@ApiBearerAuth()
@UseGuards(
    JwtAuthGuard,
    TenantMembershipGuard,
    TenantGuard,
    CapabilityGuard,
)
@Capabilities('PRODUCT_MANAGEMENT')

@Controller('pharmacy/all/settings')
export class PharmacySettingController {
    constructor(private readonly settingService: PharmacySettingService) {
    }

    @Get()
    @ApiOperation({summary: 'Get all market settings'})
    @ApiResponse({status: 200, description: 'Returns all settings as an object.'})
    getAll() {
        return this.settingService.getAllSettings();
    }

    @Get(':key')
    @ApiOperation({summary: 'Get a specific setting by key'})
    @ApiResponse({status: 200, description: 'Returns the specific setting value.'})
    getOne(@Param('key') key: string) {
        return this.settingService.getSetting(key);
    }

    @Put('shipping')
    @ApiOperation({summary: 'Update shipping methods configuration'})
    @ApiResponse({status: 200, description: 'Shipping settings updated.'})
    updateShipping(@Body() updateShippingDto: UpdateShippingDto) {
        return this.settingService.updateShippingSettings(updateShippingDto);
    }

    @Put('bulk')
    @ApiOperation({summary: 'Bulk update settings'})
    @ApiResponse({status: 200, description: 'Settings updated successfully.'})
    bulkUpdate(@Body() bulkUpdateDto: BulkUpdateSettingsDto) {
        return this.settingService.bulkUpdateSettings(bulkUpdateDto);
    }

    @Post()
    @ApiOperation({summary: 'Update or create a specific setting'})
    @ApiResponse({status: 200, description: 'Setting saved successfully.'})
    update(@Body() updateSettingDto: UpdateSettingDto) {
        return this.settingService.updateSetting(
            updateSettingDto.key,
            updateSettingDto.value
        );
    }
}