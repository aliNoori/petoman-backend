import {
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Delete,
    Body, Query,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Controller('notifications')
export class NotificationController {
    constructor(private service: NotificationService) {}

    // 📌 ایجاد نوتیفیکیشن
    @Post()
    create(@Body() dto: CreateNotificationDto) {
        return this.service.create(dto);
    }
    @Get('user/:id')
    getUserNotifications(
        @Param('id') id: string,
        @Query('panelType') panelType?: string
    ) {
        return this.service.findUserNotifications(id, panelType);
    }

    @Get('user/:id/unread')
    getUserUnread(@Param('id') id: string) {
        return this.service.findUnread(id);
    }


    @Get('user/:id/unread-count')
    getUnreadCount(@Param('id') id: string) {
        return this.service.countUnread(id);
    }


    @Patch('read/:id')
    markRead(@Param('id') id: string) {
        return this.service.markAsRead(id);
    }

    @Patch('user/:id/read-all')
    markAllRead(@Param('id') id: string) {
        return this.service.markAllAsRead(id);
    }

    @Delete(':id')
    delete(@Param('id') id: string) {
        return this.service.delete(id);
    }

    @Delete('user/:id')
    deleteUserNotifications(@Param('id') id: string) {
        return this.service.deleteAllForUser(id);
    }
}
