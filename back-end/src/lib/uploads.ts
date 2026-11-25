import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { MultipartFile } from '@fastify/multipart';
import { env } from '../env/index.js';

export const uploadsRoot = path.resolve(env.UPLOADS_DIR);

export interface StoredFile {
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
}

export async function storeUpload(file: MultipartFile): Promise<StoredFile> {
  await mkdir(uploadsRoot, { recursive: true });
  const ext = path.extname(file.filename).toLowerCase().slice(0, 12);
  const storedName = `${randomUUID()}${ext}`;
  const target = path.join(uploadsRoot, storedName);
  await pipeline(file.file, createWriteStream(target));
  const info = await stat(target);
  return {
    originalName: file.filename,
    storedName,
    mimeType: file.mimetype || 'application/octet-stream',
    sizeBytes: info.size,
  };
}

export function resolveUploadPath(storedName: string): string {
  const resolved = path.resolve(uploadsRoot, storedName);
  if (!resolved.startsWith(uploadsRoot)) {
    throw new Error('Caminho de arquivo inválido');
  }
  return resolved;
}

/** Remove um arquivo enviado; ignora se ele já não existir. */
export async function removeUpload(storedName: string): Promise<void> {
  await rm(resolveUploadPath(storedName), { force: true });
}
