import {Controller, Get, Patch, Body, Req, UseInterceptors, UploadedFiles} from '@nestjs/common';
import { AppearanceSettingService } from './appearance-setting.service';
import { UpdateAppearanceSettingDto} from "./dto/update-appearance-setting.dto";
import {FileFieldsInterceptor} from "@nestjs/platform-express";
import {uploadOptions} from "../../../../utils/file-upload.utils";
import {CreateDocumentaryDto} from "../../documentation/dto/create-documentary.dto";

@Controller({ path: 'settings/appearance'})
export class AppearanceSettingController {
    constructor(private readonly appearanceService: AppearanceSettingService) {}

    @Get()
    getSettings() {
        return this.appearanceService.getAllAsObject();
    }

    @Patch()
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'logo', maxCount: 1 },
        { name: 'favicon', maxCount: 1 }
    ], uploadOptions('appearances')) as any)
    updateSettings(@Body() dto:UpdateAppearanceSettingDto,
                   @UploadedFiles() files: {
                       logo?: Express.Multer.File[],
                       favicon?: Express.Multer.File[]
                   }) {

        return this.appearanceService.updateSettings(dto,files);
    }
}