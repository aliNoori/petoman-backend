import { extname } from 'path';
import { UploadType } from './file-type.enum';

export function getUploadPath(type: UploadType): string {
    switch (type) {
        case UploadType.IMAGE:
            return './uploads/images';
        case UploadType.VIDEO:
            return './uploads/videos';
        default:
            return './uploads/files';
    }
}

export function fileNameGenerator(req, file, callback) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname);
    callback(null, `${uniqueSuffix}${ext}`);
}
