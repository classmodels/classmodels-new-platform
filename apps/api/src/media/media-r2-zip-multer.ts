import { Upload } from '@aws-sdk/lib-storage';
import { randomUUID } from 'crypto';
import type { StorageEngine } from 'multer';
import { getR2Client, mediaUsesR2, r2BucketName } from './media-r2';

export type R2ZipMulterFile = Express.Multer.File & {
  r2StorageKey?: string;
  r2Uploaded?: boolean;
};

/** Stream ZIP rechtstreeks naar R2 (geen 5 GB op /app/shared). */
export function createR2ZipMulterStorage(): StorageEngine {
  return {
    _handleFile(_req, file, cb) {
      if (!mediaUsesR2()) {
        cb(new Error('R2 ZIP storage vereist MEDIA_BACKEND=r2'));
        return;
      }
      const storageKey = `${randomUUID()}.zip`;
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
          ContentType: file.mimetype || 'application/zip',
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
          } as R2ZipMulterFile);
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          cb(new Error(`ZIP stream naar R2 mislukt: ${msg}`));
        });
    },
    _removeFile(_req, _file, cb) {
      cb(null);
    },
  };
}
