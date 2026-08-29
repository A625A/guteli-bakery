import { getRequestId } from '@/server/observability/request-id';
import { listPublicProducts } from '@/server/products/list-public-products';

export const dynamic = 'force-dynamic';

const CATALOG_CACHE_CONTROL =
  'public, max-age=0, s-maxage=60, stale-while-revalidate=300';

function errorResponse(
  requestId: string,
  code: string,
  message: string,
  status: number,
) {
  return Response.json(
    { error: { code, message, requestId } },
    { status, headers: { 'x-request-id': requestId } },
  );
}

export async function GET(request: Request) {
  const requestId = getRequestId(request.headers);
  try {
    const catalog = await listPublicProducts();
    return Response.json(catalog, {
      status: 200,
      headers: {
        'x-request-id': requestId,
        'cache-control': CATALOG_CACHE_CONTROL,
      },
    });
  } catch {
    return errorResponse(
      requestId,
      'INTERNAL_ERROR',
      'No se pudo cargar el catálogo.',
      500,
    );
  }
}

export { CATALOG_CACHE_CONTROL };
