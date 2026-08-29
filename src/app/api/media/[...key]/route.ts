import { createHash } from 'node:crypto';

import { getRequestId } from '@/server/observability/request-id';
import { findPublicMedia } from '@/server/products/repository';
import { createObjectStorage } from '@/server/storage';

export const dynamic = 'force-dynamic';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const SAFE_MEDIA_CACHE_CONTROL =
  'public, max-age=0, s-maxage=60, stale-while-revalidate=300';
const IMMUTABLE_MEDIA_CACHE_CONTROL = 'public, max-age=31536000, immutable';

function decodeKey(parts: string[] | undefined) {
  if (!parts || parts.length === 0 || parts.length > 8) return null;
  const decoded: string[] = [];
  try {
    for (const part of parts) {
      const value = decodeURIComponent(part);
      if (
        value.length === 0 ||
        value === '.' ||
        value === '..' ||
        value.includes('/') ||
        value.includes('\\') ||
        value.includes('\0')
      ) {
        return null;
      }
      decoded.push(value);
    }
  } catch {
    return null;
  }
  return decoded.join('/');
}

function hashedKey(key: string) {
  const fileName = key.split('/').pop() ?? '';
  const match = /^(?:sha256-)?([a-f0-9]{64})\.(?:jpe?g|png|webp)$/i.exec(
    fileName,
  );
  return match?.[1].toLowerCase() ?? null;
}

function isVerifiedHash(key: string, bytes: Buffer) {
  const hash = hashedKey(key);
  return (
    hash !== null && createHash('sha256').update(bytes).digest('hex') === hash
  );
}

function notFound(requestId: string) {
  return Response.json(
    {
      error: {
        code: 'MEDIA_NOT_FOUND',
        message: 'Imagen no encontrada.',
        requestId,
      },
    },
    { status: 404, headers: { 'x-request-id': requestId } },
  );
}

export async function GET(
  request: Request,
  context: { params: Promise<{ key: string[] }> },
) {
  const requestId = getRequestId(request.headers);
  const { key: parts } = await context.params;
  const storageKey = decodeKey(parts);
  if (!storageKey) return notFound(requestId);

  try {
    const metadata = await findPublicMedia(storageKey);
    if (!metadata || !ALLOWED_MIME_TYPES.has(metadata.mimeType)) {
      return notFound(requestId);
    }
    const bytes = await createObjectStorage().read(metadata.storageKey);
    if (!bytes) return notFound(requestId);
    const headers = new Headers({
      'content-type': metadata.mimeType,
      'cache-control': isVerifiedHash(metadata.storageKey, bytes)
        ? IMMUTABLE_MEDIA_CACHE_CONTROL
        : SAFE_MEDIA_CACHE_CONTROL,
      'x-content-type-options': 'nosniff',
      'x-request-id': requestId,
    });
    return new Response(new Uint8Array(bytes), { status: 200, headers });
  } catch {
    return Response.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'No se pudo cargar la imagen.',
          requestId,
        },
      },
      { status: 500, headers: { 'x-request-id': requestId } },
    );
  }
}
