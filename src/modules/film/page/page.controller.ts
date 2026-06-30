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
    UseInterceptors,
} from '@nestjs/common';
import { PageService } from './page.service';
import { CreateFilmPageDto } from './dto/create-film-page.dto';
import { UpdateFilmPageDto } from './dto/update-film-page.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { uploadOptions } from '../../../utils/file-upload.utils';

@Controller({ path: 'film-pages', version: '1' })
export class PageController {
    constructor(private readonly pageService: PageService) {}

    @Post()
    @UseInterceptors(FileInterceptor('featuredImage', uploadOptions('pages')) as any)
    async create(@Body() dto: CreateFilmPageDto, @UploadedFile() file: Express.Multer.File) {
        return this.pageService.create(dto, file);
    }

    @Get()
    findAll() {
        return this.pageService.findAll();
    }

    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.pageService.findOne(id);
    }

    @Patch(':id')
    @UseInterceptors(FileInterceptor('featuredImage', uploadOptions('pages')) as any)
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateFilmPageDto,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        return this.pageService.update(id, dto, file);
    }

    @Delete(':id')
    remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.pageService.remove(id);
    }
}