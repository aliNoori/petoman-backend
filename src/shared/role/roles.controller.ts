import {Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Put} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto'; // <--- مسیر جدید
import { UpdateRoleDto } from './dto/update-role.dto'; // <--- مسیر جدید
import { Role} from "../../core/entities/role.entity";
import {JwtAuthGuard} from "../auth/guards/jwt-auth.guard";
import {AdminGuard} from "../auth/guards/admin-guard";
import {Permissions} from "../auth/decorators/permissions.decorator";

@ApiTags('مدیریت نقش‌ها')
@Controller('admin/roles')
@UseGuards(JwtAuthGuard, AdminGuard)
@Permissions('tenant.manage')
export class RolesController {
    constructor(private readonly rolesService: RolesService) {}

    @Get()
    @ApiOperation({ summary: 'دریافت لیست تمام نقش‌ها' })
    @ApiResponse({ status: 200, type: [Role] })
    findAll() {
        return this.rolesService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'دریافت جزئیات یک نقش' })
    @ApiResponse({ status: 200, type: Role })
    findOne(@Param('id') id: string) {
        return this.rolesService.findOne(id);
    }

    @Post()
    @ApiOperation({ summary: 'ایجاد نقش جدید' })
    @ApiResponse({ status: 201, type: Role })
    create(@Body() createRoleDto: CreateRoleDto) {
        return this.rolesService.create(createRoleDto);
    }

    @Put(':id')
    @ApiOperation({ summary: 'ویرایش نقش' })
    @ApiResponse({ status: 200, type: Role })
    update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
        return this.rolesService.update(id, updateRoleDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'حذف نقش' })
    @ApiResponse({ status: 204 })
    remove(@Param('id') id: string) {
        return this.rolesService.remove(id);
    }
}