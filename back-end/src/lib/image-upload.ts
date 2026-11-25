import type { FastifyRequest } from 'fastify';
import { HttpError } from '../https/errors/index.js';
import { removeUpload, storeUpload, type StoredFile } from './uploads.js';

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/** Lê um único arquivo de imagem de um multipart/form-data e grava em UPLOADS_DIR. */
export async function receiveImageUpload(request: FastifyRequest): Promise<StoredFile> {
  if (!request.isMultipart()) {
    throw new HttpError('Envie a imagem como multipart/form-data', 400);
  }
  const file = await request.file();
  if (!file || !file.filename) throw new HttpError('Selecione uma imagem', 400);
  if (!IMAGE_MIME_TYPES.includes(file.mimetype)) {
    file.file.resume();
    throw new HttpError('Formato não suportado. Envie JPG, PNG, WEBP ou GIF.', 415);
  }

  const stored = await storeUpload(file);
  if (file.file.truncated) {
    await removeUpload(stored.storedName);
    throw new HttpError('A imagem excede o tamanho máximo permitido', 413);
  }
  return stored;
}
