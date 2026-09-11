import { getRequestId } from '@/server/observability/request-id';
import {
  addProductImage,
  consumeAdminUploadLimit,
} from '@/server/products/add-product-image';
import {
  adminCatalogErrorResponse,
  privateAdminCatalogHeaders,
} from '@/server/products/admin-http';
import { createObjectStorage } from '@/server/storage';
import {
  readProductImageMultipart,
  validateAndTransformProductImage,
} from '@/server/storage/image-validation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  const requestId = getRequestId(request.headers);
  if (new URL(request.url).search) {
    return adminCatalogErrorResponse(
      new RangeError('Invalid upload query.'),
      requestId,
    );
  }
  try {
    await consumeAdminUploadLimit(request.headers);
    const upload = await readProductImageMultipart(request);
    const image = await validateAndTransformProductImage(upload);
    const result = await addProductImage({
      productId: upload.productId,
      expectedVersion: upload.expectedVersion,
      image,
      requestHeaders: request.headers,
      requestId,
      storage: createObjectStorage(),
    });
    return Response.json(result, {
      status: 201,
      headers: privateAdminCatalogHeaders(requestId),
    });
  } catch (error) {
    return adminCatalogErrorResponse(error, requestId);
  }
}
