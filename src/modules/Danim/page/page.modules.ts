import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

import { DanimPage} from "./page.entity";
import { PageService } from './page.service';
import { PageController} from "./page.controller";

@Module({
    imports: [
        TypeOrmModule.forFeature([DanimPage]),

        // ----------------------------------------------------
        // Multer Module (پیکربندی آپلود تصویر صفحات)
        // ----------------------------------------------------
        MulterModule.register({
            storage: diskStorage({
                destination: './uploads/pages',
                filename: (req, file, callback) => {
                    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    const ext = extname(file.originalname);
                    callback(null, `page-${unique}${ext}`);
                },
            }),
        }),
    ],

    controllers: [PageController],
    providers: [PageService],
    exports: [PageService],
})
export class DanimPageModule {}
