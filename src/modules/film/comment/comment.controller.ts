import { Controller, Get, Post, Body, Param, Delete, Query, Patch } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto, UpdateCommentStatusDto} from "./dto/comment.dto";

@Controller({path:'comments',version:'1'})
export class CommentController {
    constructor(private readonly commentService: CommentService) {}

    @Get()
    findAll(
        @Query('search') search?: string,
        @Query('status') status?: string,
    ) {
        return this.commentService.findAll(search, status);
    }

    @Post()
    create(@Body() dto: CreateCommentDto) {
        return this.commentService.create(dto);
    }

    @Patch(':id/status')
    updateStatus(@Param('id') id: number, @Body() dto: UpdateCommentStatusDto) {
        return this.commentService.updateStatus(id, dto);
    }

    @Delete(':id')
    delete(@Param('id') id: number) {
        return this.commentService.delete(id);
    }
}