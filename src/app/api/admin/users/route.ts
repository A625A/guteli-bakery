import { z } from 'zod';

import {
  AdminUserError,
  createAdminUser,
  listAdminUsers,
  parseAdminUserPagination,
} from '@/server/auth/admin-users';
import { AuthorizationError } from '@/server/auth/authorize';
import { getRequestId } from '@/server/observability/request-id';
import { InvalidMutationOriginError } from '@/server/security/origin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const privateHeaders = (requestId: string) => ({
  'cache-control': 'private, no-store',
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
  'x-request-id': requestId,
  'x-robots-tag': 'noindex, nofollow',
});

const createSchema = z
  .object({
    kind: z.literal('CREATE'),
    email: z.string().trim().toLowerCase().email().max(254),
    name: z.string().trim().min(1).max(160),
    role: z.literal('ADMIN'),
  })
  .strict();

function errorResponse(
  requestId: string,
  code: string,
  message: string,
  status: number,
) {
  return Response.json(
    { error: { code, message, requestId } },
    { status, headers: privateHeaders(requestId) },
  );
}

export function adminUsersErrorResponse(error: unknown, requestId: string) {
  if (error instanceof AuthorizationError) {
    const status = error.code === 'FORBIDDEN' ? 403 : 401;
    const message =
      error.code === 'REAUTHENTICATION_REQUIRED'
        ? 'Vuelve a iniciar sesión y completa MFA para continuar.'
        : error.code === 'FORBIDDEN'
          ? 'Esta acción requiere una cuenta propietaria.'
          : 'Inicia sesión y completa MFA para continuar.';
    return errorResponse(requestId, error.code, message, status);
  }
  if (error instanceof InvalidMutationOriginError) {
    return errorResponse(
      requestId,
      error.code,
      'El origen de la solicitud no es válido.',
      403,
    );
  }
  if (error instanceof AdminUserError) {
    switch (error.code) {
      case 'ADMIN_EMAIL_EXISTS':
        return errorResponse(
          requestId,
          error.code,
          'Ya existe una cuenta con ese correo.',
          409,
        );
      case 'ADMIN_USER_NOT_FOUND':
        return errorResponse(
          requestId,
          error.code,
          'No se encontró la cuenta administrativa.',
          404,
        );
      case 'LAST_ACTIVE_OWNER':
        return errorResponse(
          requestId,
          error.code,
          'Debe permanecer al menos una cuenta propietaria activa.',
          409,
        );
      case 'SELF_DISABLE_FORBIDDEN':
        return errorResponse(
          requestId,
          error.code,
          'No puedes desactivar tu propia cuenta desde esta sesión.',
          409,
        );
      case 'WEAK_SETUP_CREDENTIAL':
        break;
    }
  }
  return errorResponse(
    requestId,
    'INTERNAL_ERROR',
    'No se pudo completar la operación administrativa.',
    500,
  );
}

function paginationFrom(request: Request) {
  const parameters = new URL(request.url).searchParams;
  for (const key of parameters.keys()) {
    if (key !== 'page' && key !== 'pageSize') {
      throw new RangeError('Invalid pagination.');
    }
    if (parameters.getAll(key).length !== 1) {
      throw new RangeError('Invalid pagination.');
    }
  }
  return parseAdminUserPagination({
    page: parameters.get('page'),
    pageSize: parameters.get('pageSize'),
  });
}

export async function GET(request: Request) {
  const requestId = getRequestId(request.headers);
  try {
    const result = await listAdminUsers(
      request.headers,
      paginationFrom(request),
    );
    return Response.json(result, {
      status: 200,
      headers: privateHeaders(requestId),
    });
  } catch (error) {
    if (error instanceof RangeError) {
      return errorResponse(
        requestId,
        'VALIDATION_ERROR',
        'La paginación no es válida.',
        400,
      );
    }
    return adminUsersErrorResponse(error, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request.headers);
  if (
    request.headers
      .get('content-type')
      ?.split(';', 1)[0]
      .trim()
      .toLowerCase() !== 'application/json'
  ) {
    return errorResponse(
      requestId,
      'VALIDATION_ERROR',
      'Los datos de la cuenta no son válidos.',
      400,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      requestId,
      'VALIDATION_ERROR',
      'Los datos de la cuenta no son válidos.',
      400,
    );
  }

  try {
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        requestId,
        'VALIDATION_ERROR',
        'Los datos de la cuenta no son válidos.',
        400,
      );
    }
    const created = await createAdminUser(
      parsed.data,
      request.headers,
      requestId,
    );
    return Response.json(created, {
      status: 201,
      headers: privateHeaders(requestId),
    });
  } catch (error) {
    return adminUsersErrorResponse(error, requestId);
  }
}

export { privateHeaders };
