import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Upload } from './upload.entity';

@Module({
  imports: [
    MulterModule.register({
      dest: './uploads',
    }),
    TypeOrmModule.forFeature([Upload]), // ← این خط مهمه
  ],
  controllers: [UploadController],
  providers: [UploadService,UploadController],
  exports: [UploadService,UploadController],
})
export class UploadModule {}