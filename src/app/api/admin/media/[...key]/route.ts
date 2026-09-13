import { getRequestId } from '@/server/observability/request-id';
import {
  adminCatalogErrorResponse,
  privateAdminCatalogHeaders,
} from '@/server/products/admin-http';
import { findAdminMedia } from '@/server/products/admin-media';
import { createObjectStorage } from '@/server/storage';
import { MAX_OBJECT_BYTES } from '@/server/storage/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

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

function notFound(requestId: string) {
  return Response.json(
    {
      error: {
        code: 'MEDIA_NOT_FOUND',
        message: 'Imagen no encontrada.',
        requestId,
      },
    },
    { status: 404, headers: privateAdminCatalogHeaders(requestId) },
  );
}

export async function GET(
  request: Request,
  context: { params: Promise<{ key: string[] }> },
) {
  const requestId = getRequestId(request.headers);
  const storageKey = decodeKey((await context.params).key);
  if (!storageKey || new URL(request.url).search) return notFound(requestId);

  try {
    const metadata = await findAdminMedia(storageKey, request.headers);
    if (!metadata || !ALLOWED_MIME_TYPES.has(metadata.mimeType)) {
      return notFound(requestId);
    }
    const bytes = await createObjectStorage().read(
      storageKey,
      MAX_OBJECT_BYTES,
    );
    if (!bytes) return notFound(requestId);
    return new Response(
      new Uint8Array(
        bytes.buffer as ArrayBuffer,
        bytes.byteOffset,
        bytes.byteLength,
      ),
      {
        status: 200,
        headers: {
          ...privateAdminCatalogHeaders(requestId),
          'content-type': metadata.mimeType,
        },
      },
    );
  } catch (error) {
    return adminCatalogErrorResponse(error, requestId);
  }
}
