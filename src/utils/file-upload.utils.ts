// src/utils/file-upload.utils.ts
import { diskStorage } from 'multer';
import { v4 as uuid } from 'uuid';
import { extname, join } from 'path';
import * as fs from 'fs';
import * as path from 'path';

// UPLOAD_PATH=/var/www/petoman/uploads   (روی سرور)
// UPLOAD_PATH=./uploads                  (روی لوکال)
// UPLOAD_PATH=https://cdn.mydomain.com   (برای CDN)
//const UPLOAD_PATH = process.env.UPLOAD_PATH || '/var/www/petoman/uploads';
const UPLOAD_PATH = process.env.UPLOAD_PATH || './uploads';//local
//const UPLOAD_PATH = process.env.UPLOAD_PATH || 'https://uploads';//cdn

export const uploadOptions = (folder: string) => ({
    storage: diskStorage({
        destination: (_req, _file, cb) => {
            const uploadPath = join(UPLOAD_PATH, folder);
            cb(null, uploadPath);
        },
        filename: (_req, file, cb) => {
            const unique = uuid();
            const ext = extname(file.originalname);
            cb(null, `${unique}${ext}`);
        },
    }),
});


export async function deleteFile(fileUrl: string, folder: string) {
    try {

        if (!UPLOAD_PATH.startsWith('http')) {
            const filePath = path.resolve(UPLOAD_PATH, folder, path.basename(fileUrl));
            if (fs.existsSync(filePath)) {
                await fs.promises.unlink(filePath);
                console.log(`🗑️ فایل حذف شد: ${filePath}`);
            } else {
                console.warn(`⚠️ فایل یافت نشد: ${filePath}`);
            }
        } else {
            // اگر CDN است → باید API حذف CDN را صدا بزنی
            console.log(`⚠️ حذف فایل از CDN باید با API انجام شود: ${fileUrl}`);
        }
    } catch (err) {
        console.error('❌ خطا در حذف فایل:', err);
    }
}