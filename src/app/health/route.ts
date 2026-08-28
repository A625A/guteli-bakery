import { getRequestId } from '@/server/observability/request-id';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const requestId = getRequestId(request.headers);

  try {
    const { checkDatabaseConnection } = await import('@/server/db/health');
    const database = await checkDatabaseConnection();

    return Response.json(
      { status: 'ok', ...database, requestId },
      {
        status: 200,
        headers: { 'x-request-id': requestId },
      },
    );
  } catch {
    return Response.json(
      { status: 'unavailable', database: 'down', requestId },
      {
        status: 503,
        headers: { 'x-request-id': requestId },
      },
    );
  }
}
