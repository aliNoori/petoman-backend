import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    ParseUUIDPipe,
    UploadedFile,
    UseInterceptors, UploadedFiles, NotFoundException, UseGuards,
} from '@nestjs/common';
import {FileFieldsInterceptor, FileInterceptor, FilesInterceptor} from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import {extname, join} from 'path';
import { DocumentaryService } from './documentary.service';
import { CreateDocumentaryDto } from './dto/create-documentary.dto';
import { UpdateDocumentaryDto } from './dto/update-documentary.dto';
import {uploadOptions} from "../../../utils/file-upload.utils";
import {LogBodyPipe} from "../../../utils/common/pipes/log-body.pipe";
import {unlink} from "fs/promises";
import {ApiTags} from "@nestjs/swagger";
import {JwtAuthGuard} from "../../../shared/auth/guards/jwt-auth.guard";
import {ResourceGuard} from "../../../shared/auth/guards/resource.guard";
import {ACL} from "../../../shared/auth/guards/acl.decorator";


@ApiTags('documentaries')

@Controller({ path: 'documentaries', version: '1' })
export class DocumentaryController {
    constructor(private readonly documentaryService: DocumentaryService) {}

    @Post()
    @UseGuards(JwtAuthGuard,ResourceGuard)
    @ACL('create', 'supporters')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'videoFile', maxCount: 1 },
        { name: 'thumbnailPreview', maxCount: 1 }
    ], uploadOptions('documentaries')) as any)
    create(
        @Body() dto: CreateDocumentaryDto,
        @UploadedFiles() files: {
            videoFile?: Express.Multer.File[],
            thumbnailPreview?: Express.Multer.File[]
        }
    ) {
        const baseUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/uploads/documentaries`;

        if (files.videoFile?.[0]) {
            if (files.videoFile) {
                dto.videoFile = `${baseUrl}/${files.videoFile[0].filename}`;
            }
        }

        if (files.thumbnailPreview?.[0]) {
            if (files.thumbnailPreview) {
                dto.thumbnailPreview = `${baseUrl}/${files.thumbnailPreview[0].filename}`;
            }
        }

        return this.documentaryService.create(dto)
    }

    @Get()
    findAll() {
        return this.documentaryService.findAll();
    }

    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.documentaryService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard,ResourceGuard)
    @ACL('create', 'supporters')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'videoFile', maxCount: 1 },
        { name: 'thumbnailPreview', maxCount: 1 }
    ], uploadOptions('documentaries')) as any)
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateDocumentaryDto,
        @UploadedFiles() files: {
            videoFile?: Express.Multer.File[]
            thumbnailPreview?: Express.Multer.File[]
        }
    ) {
        const baseUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/uploads/documentaries`;

        // 🎞️ اگر فایل ویدیو جدید آپلود شده
        if (files.videoFile?.[0]) {
            // فایل قبلی را حذف کن
            await this.documentaryService.deleteOldFile(id, 'videoFile');
            // فایل جدید را تنظیم کن
            if (files.videoFile) {
                dto.videoFile = `${baseUrl}/${files.videoFile[0].filename}`;
            }

            dto.videoUrl = undefined;
        }

        if (files.thumbnailPreview?.[0]) {
            await this.documentaryService.deleteOldFile(id, 'thumbnailPreview');
            if (files.thumbnailPreview) {
                dto.thumbnailPreview = `${baseUrl}/${files.thumbnailPreview[0].filename}`;
            }
        }

        // اگر ویدیو به‌صورت URL ارسال شد، باید فایل قبلی حذف بشود
        if (dto.videoUrl && !files.videoFile?.[0]) {
            await this.documentaryService.deleteOldFile(id, 'videoFile');
        }

        return this.documentaryService.update(id, dto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard,ResourceGuard)
    @ACL('create', 'supporters')
    async remove(@Param('id', ParseUUIDPipe) id: string) {
        // پیدا کردن مستند با id
        const documentary = await this.documentaryService.findOne(id); // فقط id می‌دیم

        // حذف فایل ویدیو
        if (documentary.videoFile && documentary.videoFile.includes('/uploads/documentaries')) {
            const videoFilename = documentary.videoFile.split('/').pop();
            if (videoFilename) {
                const videoPath = join(process.cwd(), 'uploads', 'documentaries', videoFilename);
                await unlink(videoPath).catch(() => null);
                console.log(`🧹 فایل ویدیو حذف شد: ${videoFilename}`);
            }
        }

        // حذف تصویر شاخص
        if (documentary.thumbnailPreview && documentary.thumbnailPreview.includes('/uploads/documentaries')) {
            const thumbFilename = documentary.thumbnailPreview.split('/').pop();
            if (thumbFilename) {
                const thumbPath = join(process.cwd(), 'uploads', 'documentaries', thumbFilename);
                await unlink(thumbPath).catch(() => null);
                console.log(`🧹 تصویر شاخص حذف شد: ${thumbFilename}`);
            }
        }

        // حذف رکورد از دیتابیس
        return this.documentaryService.removeById(id);
    }
}