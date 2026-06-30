import {Injectable, InternalServerErrorException} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Upload } from './upload.entity';
import { UploadType } from './file-type.enum';
import * as fs from "fs";
@Injectable()
export class UploadService {
  constructor(
      @InjectRepository(Upload)
      private readonly uploadRepo: Repository<Upload>,
  ) {}

  async saveFile(file: Express.Multer.File, type: UploadType): Promise<Upload> {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

    const filename = file.filename;
    const folder =
        type === UploadType.IMAGE
            ? 'images'
            : type === UploadType.VIDEO
                ? 'videos'
                : 'files';

    const url = `${baseUrl}/uploads/${folder}/${filename}`;

    const upload = this.uploadRepo.create({
      filename,
      mimetype: file.mimetype,
      url,
    });

    return this.uploadRepo.save(upload);
  }

  async deleteFile(url: string) {
    try {
      if (!url) return { success: false, message: 'URL نامعتبر' }

      const relativePath = url.replace(/^.*\/uploads\//, '')
      const filePath = `./uploads/${relativePath}`

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        return { success: true, message: 'فایل حذف شد' }
      }

      return { success: false, message: 'فایل یافت نشد' }
    } catch (err) {
      throw new InternalServerErrorException('خطا در حذف فایل')
    }
  }
  /**
   * حذف یک یا چند فایل بر اساس URL
   * @param urls - یک رشته (تک فایل) یا آرایه‌ای از رشته‌ها (چند فایل)
   */
  async deleteFiles(urls: string | string[]): Promise<{ success: boolean; message: string; deletedCount?: number }> {
    try {
      // ۱. نرمال‌سازی ورودی: تبدیل تک رشته به آرایه
      const urlArray = Array.isArray(urls) ? urls : [urls];

      if (urlArray.length === 0) {
        return { success: false, message: 'هیچ URLی ارسال نشده است' };
      }

      // ۲. ایجاد لیستی از عملیات حذف (Promises)
      const deletePromises = urlArray.map(async (url) => {
        if (!url) return null;

        try {
          // استخراج مسیر نسبی (مشابه کد قبلی)
          const relativePath = url.replace(/^.*\/uploads\//, '');
          const filePath = `./uploads/${relativePath}`;

          // بررسی وجود و حذف فایل
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return { success: true };
          }
          return { success: false }; // فایل وجود نداشت
        } catch (err) {
          // لاگ خطای داخلی برای هر فایل، اما جلوگیری از توقف کل پروسه
          console.error(`Error deleting file ${url}:`, err);
          return { success: false };
        }
      });

      // ۳. اجرای همزمان تمام عملیات حذف
      const results = await Promise.all(deletePromises);

      // ۴. شمارش تعداد فایل‌هایی که با موفقیت حذف شدند
      const deletedCount = results.filter(r => r && r.success).length;

      return {
        success: true,
        message: `${deletedCount} فایل با موفقیت حذف شد`,
        deletedCount
      };

    } catch (err) {
      console.error('Critical error in deleteFiles:', err);
      throw new InternalServerErrorException('خطا در پردازش درخواست حذف فایل‌ها');
    }
  }
}