import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth
} from '@nestjs/swagger';
import { UserAddressService} from "./address.service";
import { CreateAddressDto, UpdateAddressDto} from "./dto/create-address.dto";
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {BlacklistGuard} from "../auth/guards/blacklist.guard";

@ApiTags('User Addresses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard,BlacklistGuard)
@Controller('user/addresses')
export class UserAddressController {
    constructor(private readonly addressService: UserAddressService) {}

    @Post()
    @ApiOperation({ summary: 'Create a new address' })
    @ApiResponse({ status: 201, description: 'Address created successfully.' })
    create(@Request() req, @Body() createAddressDto: CreateAddressDto) {
        return this.addressService.create(req.user.id, createAddressDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all user addresses' })
    @ApiResponse({ status: 200, description: 'List of addresses.' })
    findAll(@Request() req) {
        return this.addressService.findAll(req.user.id);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a specific address by ID' })
    @ApiResponse({ status: 200, description: 'Address details.' })
    findOne(@Param('id') id: string, @Request() req) {
        return this.addressService.findOne(id, req.user.id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update an address' })
    @ApiResponse({ status: 200, description: 'Address updated successfully.' })
    update(@Param('id') id: string, @Request() req, @Body() updateAddressDto: UpdateAddressDto) {
        return this.addressService.update(id, req.user.id, updateAddressDto);
    }

    @Patch(':id/set-default')
    @ApiOperation({ summary: 'Set an address as default' })
    @ApiResponse({ status: 200, description: 'Default address updated.' })
    setDefault(@Param('id') id: string, @Request() req) {
        return this.addressService.setDefault(id, req.user.id);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete an address' })
    @ApiResponse({ status: 204, description: 'Address deleted successfully.' })
    remove(@Param('id') id: string, @Request() req) {
        return this.addressService.remove(id, req.user.id);
    }
}