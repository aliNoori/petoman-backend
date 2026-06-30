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
import { CreateDanimPageDto} from "./dto/create-danim-page.dto";
import { UpdateDanimPageDto} from "./dto/update-danim-page.dto";
import { FileInterceptor } from '@nestjs/platform-express';
import { uploadOptions } from '../../../utils/file-upload.utils';
import {ApiTags} from "@nestjs/swagger";

@ApiTags('danim-pages')

@Controller({ path: 'danim-pages', version: '1' })
export class PageController {
    constructor(private readonly pageService: PageService) {}

    //Create new page
    @Post()
    @UseInterceptors(FileInterceptor('image', uploadOptions('pages')) as any)
    async create(
        @Body() dto: CreateDanimPageDto,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        return this.pageService.create(dto, file);
    }

    // Pages list
    @Get()
    async findAll() {
        return this.pageService.findAll();
    }

    // Get one page
    @Get(':id')
    async findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.pageService.findOne(id);
    }

    // Update page
    @Patch(':id')
    @UseInterceptors(FileInterceptor('image', uploadOptions('pages')) as any)
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateDanimPageDto,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        return this.pageService.update(id, dto, file);
    }

    // Delete page
    @Delete(':id')
    async remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.pageService.remove(id);
    }
}