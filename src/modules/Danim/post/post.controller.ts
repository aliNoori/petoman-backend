import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    ParseUUIDPipe, UseGuards, Req,
} from '@nestjs/common';

import { PostService } from "./post.service";
import { CreateDanimPostDto } from "./dto/create-danim-post.dto";
import { UpdateDanimPostDto } from "./dto/update-danim-post.dto";
import {JwtAuthGuard} from "../../../shared/auth/guards/jwt-auth.guard";
import {ResourceGuard} from "../../../shared/auth/guards/resource.guard";
import {ACL} from "../../../shared/auth/guards/acl.decorator";
import {CurrentUser} from "../../../shared/auth/guards/current-user.decorator";
import {User} from "../../../shared/user/entities/user.entity";
import {ApiTags} from "@nestjs/swagger";
import {BlacklistGuard} from "../../../shared/auth/guards/blacklist.guard";

@ApiTags('posts')

@Controller({ path: 'posts', version: '1' })
export class PostController {
    constructor(private readonly postService: PostService) {}

    @Post()
    @UseGuards(JwtAuthGuard, ResourceGuard)
    @ACL('create', 'posts')
    async create(@Body() dto: CreateDanimPostDto,@CurrentUser() user: User) {
        return this.postService.create(dto,user);
    }

    @Get()
    async findAll(@Req() req) {
        const user = req.user as User | undefined;
        const userId = user?.id;
        return this.postService.findAll(userId);
    }

    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.postService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, ResourceGuard)
    @ACL('create', 'posts')
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateDanimPostDto,
    ) {
        return this.postService.update(id, dto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, ResourceGuard)
    @ACL('create', 'posts')
    remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.postService.remove(id);
    }

    // 👇 افزایش ویو
    @Patch(':id/views')
    incrementViews(@Param('id', ParseUUIDPipe) id: string) {
        return this.postService.incrementViews(id);
    }

    @UseGuards(JwtAuthGuard,BlacklistGuard)
    @Patch(':id/like')
    async toggleLike(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: User,
    ) {
        const userId = user.id;
        if (!userId) {
            throw new Error('User not authenticated');
        }
        return this.postService.toggleLike(id, userId);
    }

    @UseGuards(JwtAuthGuard,BlacklistGuard)
    @Patch(':id/bookmark')
    async toggleBookmark(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: User,
    ) {
        const userId = user.id;
        if (!userId) {
            throw new Error('User not authenticated');
        }
        return this.postService.toggleBookmark(id, userId);
    }
}