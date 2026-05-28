import { Upload } from '@aws-sdk/lib-storage';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import type { StorageEngine } from 'multer';
import { getR2Client, mediaUsesR2, r2BucketName } from './media-r2';

export type R2StreamMulterFile = Express.Multer.File & {
  r2StorageKey?: string;
  r2Uploaded?: boolean;
};

const LARGE_EXT = /\.(zip|mp4|webm|mov|m4v|mkv|avi)$/i;

/** Stream groot bestand rechtstreeks naar R2 (geen volledige schijf/RAM). */
export function createR2StreamMulterStorage(): StorageEngine {
  return {
    _handleFile(_req, file, cb) {
      if (!mediaUsesR2()) {
        cb(new Error('R2 stream-upload vereist MEDIA_BACKEND=r2'));
        return;
      }
      const orig = file.originalname || 'upload.bin';
      const ext = extname(orig).toLowerCase() || '.bin';
      if (!LARGE_EXT.test(ext)) {
        cb(new Error(`Bestandstype niet toegestaan voor stream-upload: ${ext}`));
        return;
      }
      const storageKey = `${randomUUID()}${ext}`;
      let sizeBytes = 0;
      file.stream.on('data', (chunk: Buffer | string) => {
        sizeBytes += typeof chunk === 'string' ? Buffer.byteLength(chunk) : chunk.length;
      });

      const upload = new Upload({
        client: getR2Client(),
        params: {
          Bucket: r2BucketName(),
          Key: storageKey,
          Body: file.stream,
          ContentType: file.mimetype || 'application/octet-stream',
        },
        queueSize: 4,
        partSize: 10 * 1024 * 1024,
        leavePartsOnError: false,
      });

      upload
        .done()
        .then(() => {
          cb(null, {
            destination: 'r2',
            filename: storageKey,
            path: storageKey,
            size: sizeBytes,
            r2StorageKey: storageKey,
            r2Uploaded: true,
          } as R2StreamMulterFile);
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          cb(new Error(`Stream naar R2 mislukt: ${msg}`));
        });
    },
    _removeFile(_req, _file, cb) {
      cb(null);
    },
  };
}
