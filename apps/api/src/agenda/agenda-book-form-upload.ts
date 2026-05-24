import { memoryStorage } from 'multer';

/** Multipart uploads voor agenda book-form (buffer → MediaService.saveFile). */
export const agendaBookFormUploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
};
