import { existsSync, readFileSync } from 'node:fs';
import { BadRequestException } from '@nestjs/common';
import { basename, extname } from 'node:path';
import sharp from 'sharp';

const HEIC_EXT_RE = /\.(heic|heif)$/i;
const HEIC_MIME_RE = /^image\/(heic|heif)$/i;
const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|heic|heif|bmp|tiff?)$/i;

function isHeicLike(file: Express.Multer.File): boolean {
  const ext = extname(file.originalname).toLowerCase();
  const mime = (file.mimetype ?? '').toLowerCase();
  return HEIC_EXT_RE.test(ext) || HEIC_MIME_RE.test(mime);
}

function isProbablyImage(file: Express.Multer.File): boolean {
  const mime = (file.mimetype ?? '').toLowerCase();
  if (mime.startsWith('image/')) return true;
  return IMAGE_EXT_RE.test(file.originalname);
}

async function heicBufferToJpeg(buf: Buffer): Promise<Buffer | null> {
  try {
    const mod = await import('heic-convert');
    const convert = mod.default ?? mod;
    const out = await convert({
      buffer: buf,
      format: 'JPEG',
      quality: 0.9,
    });
    return Buffer.from(out);
  } catch (e) {
    console.warn('[media] heic-convert mislukt:', e instanceof Error ? e.message : e);
    return null;
  }
}

async function sharpToJpeg(buf: Buffer): Promise<Buffer | null> {
  try {
    return await sharp(buf).rotate().jpeg({ quality: 88 }).toBuffer();
  } catch {
    return null;
  }
}

async function toJpegBuffer(buf: Buffer, file: Express.Multer.File): Promise<Buffer> {
  if (isHeicLike(file)) {
    const fromHeic = await heicBufferToJpeg(buf);
    if (fromHeic) return fromHeic;
  }
  const fromSharp = await sharpToJpeg(buf);
  if (fromSharp) return fromSharp;
  if (!isHeicLike(file)) {
    const fromHeic = await heicBufferToJpeg(buf);
    if (fromHeic) return fromHeic;
  }
  throw new BadRequestException(
    'De foto kon niet worden gelezen. Probeer JPG of PNG. Op iPhone: Instellingen → Camera → Formaat → Meest compatibel.',
  );
}

/**
 * Zorgt dat Sharp en browsers het bestand aankunnen (o.a. iPhone HEIC → JPEG).
 * Aanroepen vóór MediaService.saveFile.
 */
export async function normalizeUploadImageFile(file: Express.Multer.File): Promise<Express.Multer.File> {
  if (!isProbablyImage(file)) return file;

  const multerPath = (file as Express.Multer.File & { path?: string }).path;
  let buf: Buffer | undefined;
  if (Buffer.isBuffer(file.buffer) && file.buffer.length > 0) {
    buf = file.buffer;
  } else if (multerPath && existsSync(multerPath)) {
    buf = readFileSync(multerPath);
  }
  if (!buf?.length) return file;

  if (isHeicLike(file)) {
    const jpegBuf = await toJpegBuffer(buf, file);
    const base = basename(file.originalname, extname(file.originalname)) || 'upload';
    return {
      ...file,
      buffer: jpegBuf,
      mimetype: 'image/jpeg',
      size: jpegBuf.length,
      originalname: `${base}.jpg`,
    };
  }

  try {
    await sharp(buf).rotate().metadata();
    return { ...file, buffer: buf, size: buf.length };
  } catch {
    const jpegBuf = await toJpegBuffer(buf, file);
    const base = basename(file.originalname, extname(file.originalname)) || 'upload';
    return {
      ...file,
      buffer: jpegBuf,
      mimetype: 'image/jpeg',
      size: jpegBuf.length,
      originalname: `${base}.jpg`,
    };
  }
}
