// src/users/users.controller.ts

import {
    Body,
    ClassSerializerInterceptor,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Req,
    UseGuards,
    UseInterceptors
} from '@nestjs/common';
import {UserService} from "./user.service";
import {CreateUserDto} from "./dto/create-user.dto";
import {UpdateUserDto} from "./dto/update-user.dto";
import {SetOnlineDto} from "./dto/set-online.dto";
import {JwtAuthGuard} from "../auth/guards/jwt-auth.guard";
import {ApiBody, ApiResponse, ApiTags} from "@nestjs/swagger";
import {CurrentUser} from "../auth/guards/current-user.decorator";
import {User} from "./entities/user.entity";
import {UpdateUserSettingDto} from "./dto/update-user-setting.dto";
import {ChangePasswordDto} from "./dto/password.dto";
import {UpdateNotificationDto} from "./dto/update-notification.dto";
import {BlacklistGuard} from "../auth/guards/blacklist.guard";

@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Users')
@UseGuards(JwtAuthGuard,BlacklistGuard)
@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) {}
    @ApiBody({ type: CreateUserDto })
    @Post()
    create(@Body() createUserDto: CreateUserDto) {
        return this.userService.create(createUserDto);
    }

    @Get('me')
    async getMe(@CurrentUser() user: User) {

        return this.userService.findOne(user.id);
    }
    @ApiResponse({ status: 200, description: 'لیست کاربران', type: [CreateUserDto] })
    @Get()
    findAll(@CurrentUser() user: User) {
        return this.userService.findFiltered(user);
    }

    @Get('supporters-with-donations')
    getSupportersWithDonations() {
        return this.userService.getSupportersWithDonations()
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.userService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
        return this.userService.update(id, updateUserDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.userService.remove(id);
    }
    @Get('online')
    async getOnlineUsers() {

        return await this.userService.getOnlineUsers();

    }
    @Post('set/online/status')
    async setOnlineStatus(@Body() dto: SetOnlineDto) {
        await this.userService.setOnlineStatus(dto.userId, dto.isOnline);
        return { success: true };
    }
    @Patch(':id/status')
    async toggleStatus(@Param('id') id: string) {
        return await this.userService.toggleUserStatus(id); // بازگشت کاربر با وضعیت جدید
    }

    @Get('me/settings')
    async getMySettings(@CurrentUser() user: User) {
        return this.userService.getUserSettings(user.id)
    }

    @Patch('me/settings')
    async updateMySettings(
        @CurrentUser() user: User,
        @Body() dto: UpdateUserSettingDto,
    ) {
        return this.userService.updateUserSettings(user.id, dto)
    }

    @UseGuards(JwtAuthGuard,BlacklistGuard)
    @Post('change-password')
    changePassword(
        @Req() req,
        @Body() dto: ChangePasswordDto,
    ) {
        return this.userService.changePassword(req.user.id, dto)
    }

    @UseGuards(JwtAuthGuard,BlacklistGuard)
    @Post('notification-token')
    saveTokenNotification(
        @Req() req,
        @Body('token') token:string ,
    ) {
        return this.userService.saveTokenNotification(req.user.id, token)
    }

    @Post('send-notification/:userId')
    @UseGuards(JwtAuthGuard,BlacklistGuard) // اگر فقط ادمین باید بتواند ارسال کند
    async sendNotification(
        @Param('userId') userId: string,
        @Body() body: { title: string; body: string; data?: any }
    ) {
        return this.userService.sendNotificationToUser(userId, body.title, body.body, body.data);
    }

    @UseGuards(JwtAuthGuard,BlacklistGuard)
    @Post('update-notification-setting')
    updateNotificationSetting(
        @Req() req,
        @Body() dto: UpdateNotificationDto, // دریافت کل DTO
    ) {
        return this.userService.updateNotificationSetting(req.user.id, dto.field, dto.enabled);
    }

}