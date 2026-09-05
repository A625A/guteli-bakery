import { z } from 'zod';

import { updateAdminUser } from '@/server/auth/admin-users';
import { getRequestId } from '@/server/observability/request-id';

import { adminUsersErrorResponse, privateHeaders } from '../route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const updateSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('SET_ACTIVE'),
      userId: z.string().uuid(),
      active: z.boolean(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('SET_ROLE'),
      userId: z.string().uuid(),
      role: z.enum(['OWNER', 'ADMIN']),
    })
    .strict(),
]);

function validationError(requestId: string) {
  return Response.json(
    {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Los datos de la cuenta no son válidos.',
        requestId,
      },
    },
    { status: 400, headers: privateHeaders(requestId) },
  );
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request.headers);
  if (
    request.headers
      .get('content-type')
      ?.split(';', 1)[0]
      .trim()
      .toLowerCase() !== 'application/json'
  ) {
    return validationError(requestId);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError(requestId);
  }

  try {
    const { id } = await context.params;
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success || parsed.data.userId !== id) {
      return validationError(requestId);
    }
    const result = await updateAdminUser(
      parsed.data,
      request.headers,
      requestId,
    );
    return Response.json(result, {
      status: 200,
      headers: privateHeaders(requestId),
    });
  } catch (error) {
    return adminUsersErrorResponse(error, requestId);
  }
}
