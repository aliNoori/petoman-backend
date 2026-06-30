import {
    Controller,
    Post,
    UploadedFile,
    UseInterceptors,
    BadRequestException, Delete, Body,
} from '@nestjs/common';
import {FileInterceptor} from '@nestjs/platform-express';
import {diskStorage} from 'multer';
import {extname, join} from 'path';
import {v4 as uuid} from 'uuid';
import {UploadService} from './upload.service';
import {UploadType} from './file-type.enum';
import * as fs from "fs";
import { exec } from 'child_process';
// مسیر پایه برای همه آپلودها
//const BASE_UPLOAD_PATH = '/var/www/petoman/uploads';
const BASE_UPLOAD_PATH = './uploads';
export const uploadOptions = (folder: string) => ({
    storage: diskStorage({
        destination: (_req, _file, cb) => {
            const uploadPath = join(BASE_UPLOAD_PATH, folder);
            // اگر پوشه وجود ندارد بساز
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, {recursive: true});
            }
            cb(null, uploadPath);
        },
        filename: (_req, file, cb) => {
            const unique = uuid();
            let ext = extname(file.originalname);
            if (!ext) {
                const mimeExt = file.mimetype?.split('/')[1] || 'bin';
                ext = '.' + mimeExt;
            }
            cb(null, `${unique}${ext}`);
        },
    }),
});

@Controller('v1/uploads')
export class UploadController {
    constructor(private readonly uploadService: UploadService) {
        ['uploads', 'uploads/images', 'uploads/videos', 'uploads/files'].forEach(p => {
            if (!fs.existsSync(p)) fs.mkdirSync(p);
        });
    }

    // 🖼️ تصاویر
    @Post('image')
    @UseInterceptors(
        FileInterceptor('file', {
            ...uploadOptions('images'),
            fileFilter: (req, file, cb) => {
                if (!file.mimetype.startsWith('image/')) {
                    return cb(
                        new BadRequestException('فقط فایل تصویری مجاز است!'),
                        false,
                    );
                }
                cb(null, true);
            },
            limits: {fileSize: 5 * 1024 * 1024}, // حداکثر ۵ مگابایت
        }) as any,
    )
    async uploadImage(@UploadedFile() file: Express.Multer.File) {
        const upload = await this.uploadService.saveFile(file, UploadType.IMAGE);
        return {url: upload.url, id: upload.id};
    }

    // 🎥 ویدیو
    @Post('video')
    @UseInterceptors(
        FileInterceptor('file', {
            ...uploadOptions('videos'),
            fileFilter: (req, file, cb) => {
                if (!file.mimetype.startsWith('video/')) {
                    return cb(
                        new BadRequestException('فقط فایل ویدیویی مجاز است!'),
                        false,
                    );
                }
                cb(null, true);
            },
            limits: {fileSize: 100 * 1024 * 1024}, // تا 100MB
        }) as any,
    )
    async uploadVideo(@UploadedFile() file: Express.Multer.File) {
        const upload = await this.uploadService.saveFile(file, UploadType.VIDEO);
        return {url: upload.url, id: upload.id};
    }

    @Post('init-video')
    async initVideo() {
        const id = uuid();   // ساختن یک شناسه یکتا
        return { videoId: id };
    }


    //chunk
    @Post('video-chunk')
    @UseInterceptors(FileInterceptor('chunk', {
        storage: diskStorage({
            destination: join(BASE_UPLOAD_PATH, 'chunks'),
            filename: (req, file, cb) => {
                cb(null, file.originalname);
            }
        }),
    }) as any)
    async uploadVideoChunk(
        @UploadedFile() file: Express.Multer.File,
        @Body('index') index: string,
        @Body('total') total: string,
        @Body('videoId') videoId?: string
    ) {
        const id = videoId || uuid();
        return {success: true, videoId: id};
    }


    /*@Post('video-merge')
    async mergeChunks(@Body('videoId') videoId: string) {
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        const chunkDir = join(BASE_UPLOAD_PATH, 'chunks');
        const finalPath = join(BASE_UPLOAD_PATH, 'videos', `${videoId}.mp4`);

        const chunkFiles = fs.readdirSync(chunkDir)
            //.filter(f => f.startsWith(videoId))
            .sort((a, b) => parseInt(a.split('-')[1]) - parseInt(b.split('-')[1]));

        return new Promise((resolve, reject) => {
            const writeStream = fs.createWriteStream(finalPath);

            writeStream.on('error', reject);
            writeStream.on('close', () => {
                // پاکسازی chunkها
                for (const chunkFile of chunkFiles) {
                    const chunkPath = join(chunkDir, chunkFile);
                    try {
                        fs.unlinkSync(chunkPath);
                    } catch (err) {
                        console.error('خطا در حذف chunk:', err);
                    }
                }
                //resolve({ url: `${baseUrl}/uploads/videos/${videoId}.mp4` });
            });



            const appendNext = (index: number) => {
                if (index >= chunkFiles.length) {
                    writeStream.end();
                    return;
                }
                const chunkPath = join(chunkDir, chunkFiles[index]);
                const readStream = fs.createReadStream(chunkPath);
                readStream.pipe(writeStream, { end: false });
                readStream.on('end', () => appendNext(index + 1));
                readStream.on('error', reject);
            };

            appendNext(0);
        });
    }*/

    @Post('video-merge')
    async mergeChunks(@Body('videoId') videoId: string) {
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        const chunkDir = join(BASE_UPLOAD_PATH, 'chunks');
        const videoDir = join(BASE_UPLOAD_PATH, 'videos');
        const tempPath = join(videoDir, `${videoId}-raw.mp4`);
        const finalPath = join(videoDir, `${videoId}.mp4`);

        const chunkFiles = fs.readdirSync(chunkDir)
            .filter(f => f.startsWith(videoId))
            .sort((a, b) => parseInt(a.split('-')[1]) - parseInt(b.split('-')[1]));

        if (chunkFiles.length === 0) {
            throw new Error('هیچ چانکی پیدا نشد');
        }

        // چسباندن باینری همه chunkها
        const writeStream = fs.createWriteStream(tempPath);
        for (const f of chunkFiles) {
            const chunkPath = join(chunkDir, f);
            const data = fs.readFileSync(chunkPath);
            writeStream.write(data);
            fs.unlinkSync(chunkPath);
        }
        writeStream.end();

        return new Promise((resolve, reject) => {
            // اجرای ffmpeg روی فایل نهایی برای ساخت moov atom
            const cmd = `ffmpeg -i "${tempPath}" -c copy -movflags faststart "${finalPath}"`;
            exec(cmd, (err) => {
                if (err) {
                    console.error('ffmpeg merge error:', err);
                    return reject(err);
                }
                fs.unlinkSync(tempPath);
                resolve({ url: `${baseUrl}/uploads/videos/${videoId}.mp4` });
            });
        });
    }



// 📄 فایل عمومی (pdf, docx, zip و ...)
    @Post('file')
    @UseInterceptors(
        FileInterceptor('file', {
            ...uploadOptions('files'),
            fileFilter: (req, file, cb) => {
                // هر نوع فایلی مجاز است ولی می‌تونیم محدود کنیم:
                const allowed = [
                    'application/pdf',
                    'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'application/zip',
                    'application/x-zip-compressed',
                    'text/plain',
                ];
                if (!allowed.includes(file.mimetype)) {
                    return cb(
                        new BadRequestException('نوع فایل مجاز نیست!'),
                        false,
                    );
                }
                cb(null, true);
            },
            limits: {fileSize: 20 * 1024 * 1024}, // تا ۲۰ مگابایت
        }) as any,
    )
    async uploadFile(@UploadedFile() file: Express.Multer.File) {
        const upload = await this.uploadService.saveFile(file, UploadType.FILE);
        return {url: upload.url, id: upload.id};
    }

    @Delete()
    delete(@Body('url') url: string) {
        return this.uploadService.deleteFile(url)
    }

    // مثال در کنترلر (مثلاً FilesController)
    @Post('cleanup')
    async cleanupFiles(@Body() body: { urls: string[] }) {
        // فراخوانی متد سرویس با آرایه URLs
        return await this.uploadService.deleteFiles(body.urls);
    }
}