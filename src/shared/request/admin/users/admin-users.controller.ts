import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminUsersService} from "./admin-users.service";
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { JwtAuthGuard} from "../../../auth/guards/jwt-auth.guard";
import { AdminGuard} from "../../../auth/guards/admin-guard";

@ApiTags('مدیریت کاربران')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminUsersController {
    constructor(private readonly usersService: AdminUsersService) {}

    @Get('regular')
    @ApiOperation({ summary: 'دریافت لیست کاربران عادی' })
    getRegularUsers() {
        return this.usersService.getRegularUsers();
    }

    @Get('admins')
    @ApiOperation({ summary: 'دریافت لیست مدیران' })
    getAdminUsers() {
        return this.usersService.getAdminUsers();
    }

    @Patch(':id/toggle-status')
    @ApiOperation({ summary: 'تغییر وضعیت کاربر (فعال/مسدود)' })
    toggleStatus(@Param('id') id: string) {
        return this.usersService.toggleUserStatus(id);
    }

    @Post('admins')
    @ApiOperation({ summary: 'ایجاد مدیر جدید' })
    createAdmin(@Body() createAdminDto: CreateAdminDto) {
        return this.usersService.createAdmin(createAdminDto);
    }

    @Patch('admins/:id')
    @ApiOperation({ summary: 'ویرایش مدیر' })
    updateAdmin(@Param('id') id: string, @Body() updateAdminDto: UpdateAdminDto) {
        return this.usersService.updateAdmin(id, updateAdminDto);
    }

    @Delete('admins/:id')
    @ApiOperation({ summary: 'حذف مدیر' })
    deleteAdmin(@Param('id') id: string) {
        return this.usersService.deleteAdmin(id);
    }

    @Patch('admins/:id/roles')
    @ApiOperation({ summary: 'تخصیص نقش به مدیر' })
    assignRoles(@Param('id') id: string, @Body() assignRolesDto: AssignRolesDto) {
        return this.usersService.assignRoles(id, assignRolesDto);
    }

}