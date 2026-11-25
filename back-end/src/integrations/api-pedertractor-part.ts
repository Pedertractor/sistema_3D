import { env } from '../env/index.js';
import { HttpError } from '../https/errors/index.js';
import type { PedertractorPart } from '../types/pedertractor-part.js';

/** Arquivo de imagem (desenho) da peça, com caminho relativo à origem da API. */
export interface PedertractorPartImage {
  name: string;
  path: string;
}

/** Peça + desenhos. (types/pedertractor-part.ts é do template e fica somente leitura.) */
export interface PedertractorPartWithImages extends PedertractorPart {
  images: PedertractorPartImage[];
}

const IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|gif)$/i;
const MAX_DRAWING_BYTES = 20 * 1024 * 1024;

/** Só caminhos relativos simples vindos da API (sem esquema, sem subir diretório). */
function isSafeRelativePath(path: string) {
  return !path.startsWith('/') && !path.includes('..') && !path.includes('\\') && !/^[a-z][a-z0-9+.-]*:/i.test(path);
}

function readImages(record: Record<string, unknown>): PedertractorPartImage[] {
  const raw = record.images;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    const image = asRecord(entry);
    const name = image ? readString(image, 'name') : null;
    const path = image ? readString(image, 'path') : null;
    if (!name || !path || !IMAGE_EXTENSIONS.test(path) || !isSafeRelativePath(path)) return [];
    return [{ name, path }];
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function mapPart(data: unknown, fallbackPartNumber: string): PedertractorPartWithImages {
  const root = asRecord(data);
  const nested = root ? asRecord(root.part) ?? asRecord(root.data) : null;
  const record = nested ?? root;
  if (!record) {
    throw new HttpError('Resposta inválida da API de peças', 502);
  }

  const partNumber =
    readString(record, 'partNumber') ??
    readString(record, 'part_number') ??
    fallbackPartNumber;
  const status = record.status;
  if (status === false) {
    throw new HttpError('Part number inativo', 404);
  }

  return {
    partNumber,
    partCode: readString(record, 'partCode'),
    description: readString(record, 'description'),
    status: typeof status === 'boolean' ? status : null,
    images: readImages(record),
  };
}

export class ApiPedertractorPart {
  async getByPartNumber(partNumber: string): Promise<PedertractorPartWithImages> {
    const trimmed = partNumber.trim().toUpperCase();
    if (!trimmed) {
      throw new HttpError('Part number é obrigatório', 400);
    }

    if (env.PART_VALIDATION_DISABLED) {
      return { partNumber: trimmed, partCode: null, description: null, status: true, images: [] };
    }

    if (!env.API_PEDERTRACTOR_URL) {
      throw new HttpError(
        'API de peças não configurada (API_PEDERTRACTOR_URL). Defina a URL ou PART_VALIDATION_DISABLED=true em dev.',
        503,
      );
    }

    let response: Response;
    try {
      response = await fetch(
      `${env.API_PEDERTRACTOR_URL}/part/number/${encodeURIComponent(trimmed)}`,
      {
        method: 'GET',
        headers: {
          nameApplication: env.APPNAME,
          key: env.APPKEY,
        },
      },
    );
    } catch {
      throw new HttpError('Não foi possível conectar na API de peças', 502);
    }

    // A API responde 400 com { message: "Nenhuma peça ativa encontrada com esse número [...]" } quando a peça
    // não existe (ou está inativa); 404 também significa "não encontrada".
    if (response.status === 400 || response.status === 404) {
      throw new HttpError(`Partnumber ${trimmed} não encontrado na base da Pedertractor (nenhuma peça ativa com esse número).`, 404);
    }

    if (response.status !== 200) {
      throw new HttpError(
        `Não foi possível consultar a base de peças da Pedertractor agora (status ${response.status}). Tente novamente.`,
        502,
      );
    }

    const data: unknown = await response.json();
    return mapPart(data, trimmed);
  }

  /** Baixa um desenho da peça. O caminho vem da própria API (images[].path) e é servido na origem dela. */
  async fetchDrawing(image: PedertractorPartImage): Promise<{ contentType: string; body: Buffer }> {
    if (!env.API_PEDERTRACTOR_URL || !isSafeRelativePath(image.path)) {
      throw new HttpError('Desenho não disponível', 404);
    }
    const url = new URL(image.path, `${new URL(env.API_PEDERTRACTOR_URL).origin}/`);

    let response: Response;
    try {
      response = await fetch(url);
    } catch {
      throw new HttpError('Não foi possível carregar o desenho agora', 502);
    }
    const contentType = response.headers.get('content-type') ?? '';
    if (!response.ok || !contentType.startsWith('image/')) {
      throw new HttpError('Desenho não disponível', 404);
    }
    const body = Buffer.from(await response.arrayBuffer());
    if (body.length > MAX_DRAWING_BYTES) throw new HttpError('Desenho grande demais para exibir', 413);
    return { contentType, body };
  }
}
