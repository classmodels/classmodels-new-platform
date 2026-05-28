import { mediaZipUploadMaxBytes } from './media-zip-import';
import { mediaUsesR2 } from './media-r2';
import { createR2StreamMulterStorage } from './media-r2-stream-multer';
import { buildZipUploadMulterOptions } from './media-zip-multer-options';

const LARGE_FILE_RE = /\.(zip|mp4|webm|mov|m4v|mkv|avi)$/i;

/** Grote ZIP/film → R2 stream, anders lokale ZIP-schijf (legacy). */
export function buildLargeMediaUploadMulterOptions() {
  const limits = { fileSize: mediaZipUploadMaxBytes() };
  const fileFilter = (
    _req: Express.Request,
    file: Express.Multer.File,
    cb: (error: Error | null, accept: boolean) => void,
  ) => {
    cb(null, LARGE_FILE_RE.test(file.originalname || ''));
  };

  if (mediaUsesR2()) {
    console.error('[media] Grote upload → direct stream naar R2');
    return { storage: createR2StreamMulterStorage(), limits, fileFilter };
  }

  return buildZipUploadMulterOptions();
}
