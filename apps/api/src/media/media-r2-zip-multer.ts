import type { StorageEngine } from 'multer';
import { createR2StreamMulterStorage, type R2StreamMulterFile } from './media-r2-stream-multer';

export type R2ZipMulterFile = R2StreamMulterFile;

/** @deprecated Gebruik createR2StreamMulterStorage */
export function createR2ZipMulterStorage(): StorageEngine {
  return createR2StreamMulterStorage();
}
