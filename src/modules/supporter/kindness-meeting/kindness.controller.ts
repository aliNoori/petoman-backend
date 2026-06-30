import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    ParseUUIDPipe, UseInterceptors, UploadedFiles, UploadedFile, UseGuards,
} from '@nestjs/common';
import {KindnessService} from './kindness.service';
import {CreateKindnessMeetingDto} from './dto/create-kindness-meeting.dto';
import {UpdateKindnessMeetingDto} from './dto/update-kindness-meeting.dto';
import {FileInterceptor} from "@nestjs/platform-express";
import {uploadOptions} from "../../../utils/file-upload.utils";
import {KindnessStatus} from "./kindness-meeting.entity";
import {ACL} from "../../../shared/auth/guards/acl.decorator";
import {CurrentUser} from "../../../shared/auth/guards/current-user.decorator";
import {User} from "../../../shared/user/entities/user.entity";
import {JwtAuthGuard} from "../../../shared/auth/guards/jwt-auth.guard";
import {ResourceGuard} from "../../../shared/auth/guards/resource.guard";
import {ApiTags} from "@nestjs/swagger";

@ApiTags('kindness-meetings')

@Controller({path: 'kindness-meetings', version: '1'})
export class KindnessController {
    constructor(private readonly kindnessService: KindnessService) {
    }

    @Post()
    @UseGuards(JwtAuthGuard,ResourceGuard)
    @ACL('create', 'supporters')
    @UseInterceptors(FileInterceptor('image', uploadOptions('kindness-meetings')) as any)
    create(@UploadedFile() file: Express.Multer.File,
           @Body() dto: CreateKindnessMeetingDto,@CurrentUser() user: User)
    {
        return this.kindnessService.create(dto,user, file);
    }

    @Get()
    findAll() {
        return this.kindnessService.findAll();
    }

    @Get(':id/registrations')
    findAllRegistrations(@Param('id') id: string) {
        return this.kindnessService.findAllRegistrations(id);
    }

    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.kindnessService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard,ResourceGuard)
    @ACL('create', 'supporters')
    @UseInterceptors(FileInterceptor('image', uploadOptions('kindness-meetings')) as any)
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @UploadedFile() file: Express.Multer.File,
        @Body() dto: UpdateKindnessMeetingDto
    ) {
        return this.kindnessService.update(id, dto, file)
    }
    @Patch(':id/status')
    @UseGuards(JwtAuthGuard,ResourceGuard)
    @ACL('create', 'supporters')
    updateStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Body('status') status: KindnessStatus
    ) {
        return this.kindnessService.toggleStatus(id, status)
    }


    @Delete(':id')
    @UseGuards(JwtAuthGuard,ResourceGuard)
    @ACL('create', 'supporters')
    remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.kindnessService.remove(id);
    }
}