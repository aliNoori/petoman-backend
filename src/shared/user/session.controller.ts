import {Controller, Get, Delete, UseGuards, Req, Param} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { SessionService } from "./session.service";
import {JwtAuthGuard} from "../auth/guards/jwt-auth.guard";
import {CurrentUser} from "../auth/guards/current-user.decorator";
import {User} from "./entities/user.entity";
import {BlacklistGuard} from "../auth/guards/blacklist.guard";

@ApiTags('Sessions')
@Controller('sessions')
@UseGuards(JwtAuthGuard,BlacklistGuard)
@ApiBearerAuth()
export class SessionController {
    constructor(private sessionService: SessionService) {}

    @Get()
    @ApiOperation({ summary: 'دریافت لیست دستگاه‌های فعال' })
    async getMySessions(@CurrentUser() user: User) {
        return this.sessionService.getUserSessions(user.id);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'خروج از یک دستگاه خاص' })
    async revokeSession(@Param('id') id: string, @CurrentUser() user: User) {
        return this.sessionService.revokeSession(id, user.id);
    }

    @Delete('revoke/revoke-all')
    @ApiOperation({ summary: 'خروج از تمام دستگاه‌ها' })
    async revokeAll(@Req() req, @CurrentUser() user: User) {
        // فرض بر این است که توکن در هدر Authorization وجود دارد
        console.log('req.headers',req.headers)
        const token = req.headers.authorization?.replace('Bearer ', '');
        console.log('token',token)
        return this.sessionService.revokeAllOtherSessions(user.id, token);
    }
}