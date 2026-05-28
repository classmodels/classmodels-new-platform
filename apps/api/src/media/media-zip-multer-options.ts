import { randomUUID } from 'crypto';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { resolveZipUploadTmpDir } from '../config/resolve-zip-upload-dir';
import { mediaZipUploadMaxBytes } from './media-zip-import';
import { mediaUsesR2 } from './media-r2';
import { createR2StreamMulterStorage } from './media-r2-stream-multer';

export function buildZipUploadMulterOptions() {
  const limits = { fileSize: mediaZipUploadMaxBytes() };
  const fileFilter = (
    _req: Express.Request,
    file: Express.Multer.File,
    cb: (error: Error | null, accept: boolean) => void,
  ) => {
    cb(null, /\.zip$/i.test(file.originalname || ''));
  };

  if (mediaUsesR2()) {
    console.error('[media] ZIP-upload → direct stream naar R2 (geen lokale schijf)');
    return { storage: createR2StreamMulterStorage(), limits, fileFilter };
  }

  return {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        cb(null, resolveZipUploadTmpDir());
      },
      filename: (_req, file, cb) => {
        cb(null, `${randomUUID()}${extname(file.originalname) || '.zip'}`);
      },
    }),
    limits,
    fileFilter,
  };
}
