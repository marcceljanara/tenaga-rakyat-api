import { HttpException } from '@nestjs/common';
import * as path from 'path';

const IMAGE_EXTENSIONS_BY_MIME: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/jpg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

export async function validateImageUpload(
  file: Express.Multer.File,
  allowedMimeTypes: string[],
): Promise<void> {
  const detectedMime = await detectMimeFromBuffer(file.buffer);

  if (detectedMime && allowedMimeTypes.includes(detectedMime)) {
    return;
  }

  const allowFallback = process.env.NODE_ENV !== 'production';
  if (allowFallback && isTrustedDevelopmentFallback(file, allowedMimeTypes)) {
    return;
  }

  throw new HttpException(
    'Invalid file type. Only JPEG, PNG, and WebP are allowed',
    422,
  );
}

async function detectMimeFromBuffer(buffer: Buffer): Promise<string | null> {
  try {
    const { fileTypeFromBuffer } = await (eval(
      'import("file-type")',
    ) as Promise<typeof import('file-type')>);
    const type = await fileTypeFromBuffer(buffer);
    return type?.mime ?? null;
  } catch {
    return null;
  }
}

function isTrustedDevelopmentFallback(
  file: Express.Multer.File,
  allowedMimeTypes: string[],
): boolean {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return false;
  }

  const extension = path.extname(file.originalname).toLowerCase();
  return IMAGE_EXTENSIONS_BY_MIME[file.mimetype]?.includes(extension) ?? false;
}
