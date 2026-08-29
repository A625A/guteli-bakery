import { getRequestId } from '@/server/observability/request-id';
import { findPublicProductBySlug } from '@/server/products/repository';

export const dynamic = 'force-dynamic';

const CATALOG_CACHE_CONTROL =
  'public, max-age=0, s-maxage=60, stale-while-revalidate=300';

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const requestId = getRequestId(request.headers);
  try {
    const { slug } = await context.params;
    const product = await findPublicProductBySlug(slug);
    if (!product) {
      return Response.json(
        {
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Producto no encontrado.',
            requestId,
          },
        },
        { status: 404, headers: { 'x-request-id': requestId } },
      );
    }
    return Response.json(product, {
      status: 200,
      headers: {
        'x-request-id': requestId,
        'cache-control': CATALOG_CACHE_CONTROL,
      },
    });
  } catch {
    return Response.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'No se pudo cargar el producto.',
          requestId,
        },
      },
      { status: 500, headers: { 'x-request-id': requestId } },
    );
  }
}
